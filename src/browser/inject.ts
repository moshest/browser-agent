export interface InjectedWindow {
  $$BrowserAgent?: InjectedContext;
}

export interface InjectedContext {
  highlightInteractiveElements: () => string[];
  removeHighlightContainer: () => void;
}

export const inject = () => {
  // Constants moved to the top
  const CONTAINER_ID = "highlight-container";
  const MAX_Z_INDEX = "2147483647";
  const CONNECTOR_Z_INDEX = "2147483646";
  const LABEL_WIDTH = 20;
  const LABEL_HEIGHT = 16;
  const COLORS = [
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFA500",
    "#800080",
    "#008080",
    "#FF69B4",
    "#4B0082",
  ];

  // Define potential anchor points (relative to element)
  // [xOffset, yOffset, priority]
  const ANCHOR_POINTS = [
    [0.5, -1.5], // Above center (highest priority)
    [1.2, 0.5], // Right middle
    [0.5, 1.5], // Below center
    [-0.2, 0.5], // Left middle
    [1.2, -0.5], // Top right
    [1.2, 1.5], // Bottom right
    [-0.2, -0.5], // Top left
    [-0.2, 1.5], // Bottom left
  ] as const;

  // Common interactive elements
  const INTERACTIVE_SELECTORS = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "details",
    "video[controls]",
    "audio[controls]",
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[role="switch"]',
    "[onclick]",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    // Calendar-specific selectors
    '[role="gridcell"]',
    '[role="date"]',
    "[data-date]",
    ".calendar-day",
    ".date-cell",
  ];

  // Type definitions
  type ElementData = {
    element: Element;
    index: number;
    rect: DOMRect;
    labelPosition: LabelPosition | null;
  };

  type LabelPosition = {
    x: number;
    y: number;
    anchorX: number | null;
    anchorY: number | null;
    transparent?: boolean;
  };

  type OccupiedSpace = {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  };

  /**
   * Enhanced function to highlight and number all interactive elements on a webpage
   */
  function highlightInteractiveElements(): string[] {
    const container = setupHighlightContainer();
    const interactiveElements = findInteractiveElements();
    const elementData = prepareElementData(interactiveElements);

    optimizeLabelPositions(elementData);
    renderHighlights(elementData, container);

    // Elements XPath
    return interactiveElements.map((el) => getXPath(el));
  }

  /**
   * Gets the XPath of a DOM element
   */
  function getXPath(element: Element): string {
    if (!element) {
      return "";
    }

    // If element has an ID, use that for a simple, robust XPath
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    // If we reached the root element, return the path
    if (element === document.documentElement) {
      return "/html";
    }

    // Get the parent element
    const parent = element.parentElement;
    if (!parent) {
      return "";
    }

    // Count siblings of the same type to determine position
    const siblings = Array.from(parent.children).filter(
      (child) => child.nodeName === element.nodeName
    );

    // If there are multiple siblings, determine position
    const position =
      siblings.length > 1
        ? `[${Array.from(siblings).indexOf(element) + 1}]`
        : "";

    // Build the XPath recursively
    return `${getXPath(parent)}/${element.nodeName.toLowerCase()}${position}`;
  }

  /**
   * Create or reset the highlight container
   */
  function setupHighlightContainer(): HTMLElement {
    // Remove any existing highlights
    removeHighlightContainer();

    // Create container for highlights
    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    Object.assign(container.style, {
      position: "fixed",
      pointerEvents: "none",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: MAX_Z_INDEX,
    });
    document.body.appendChild(container);

    return container;
  }

  function removeHighlightContainer(): void {
    const container = document.getElementById(CONTAINER_ID);
    if (container) {
      container.remove();
    }
  }

  /**
   * Create initial element data objects with positions
   */
  function prepareElementData(elements: Element[]): ElementData[] {
    return elements.map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        index,
        rect,
        labelPosition: null, // Will be determined later
      };
    });
  }

  /**
   * Render all highlights based on the prepared element data
   */
  function renderHighlights(
    elementData: ElementData[],
    container: HTMLElement
  ): void {
    elementData.forEach((data) => {
      highlightElement(
        data.element,
        data.index,
        data.labelPosition!,
        container
      );
    });
  }

  /**
   * Check if an element is truly visible on the page
   */
  function isElementTrulyVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    if (hasBasicHiddenProperties(element, rect, style)) {
      return false;
    }

    if (!isInViewport(rect)) {
      return false;
    }

    if (isHiddenByScrollContainer(element, rect)) {
      return false;
    }

    if (isHiddenByOverlay(element, rect)) {
      return false;
    }

    return true;
  }

  /**
   * Check basic element properties that would make it hidden
   */
  function hasBasicHiddenProperties(
    element: Element,
    rect: DOMRect,
    style: CSSStyleDeclaration
  ): boolean {
    return (
      rect.width <= 0 ||
      rect.height <= 0 ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      element.getAttribute("aria-hidden") === "true" ||
      element.getAttribute("aria-disabled") === "true" ||
      style.pointerEvents === "none" ||
      element.getAttribute("disabled") === "true" ||
      style.opacity === "0"
    );
  }

  /**
   * Check if element is within the viewport
   */
  function isInViewport(rect: DOMRect): boolean {
    return !(
      rect.bottom < -50 ||
      rect.top > window.innerHeight + 50 ||
      rect.right < -50 ||
      rect.left > window.innerWidth + 50
    );
  }

  /**
   * Check if element is hidden by a scroll container
   */
  function isHiddenByScrollContainer(element: Element, rect: DOMRect): boolean {
    let currentNode: Element | null = element;
    while (currentNode && currentNode !== document.body) {
      if (currentNode instanceof HTMLElement) {
        const parentStyle = window.getComputedStyle(currentNode);

        if (
          ["auto", "scroll", "hidden"].includes(parentStyle.overflowY) ||
          ["auto", "scroll", "hidden"].includes(parentStyle.overflowX)
        ) {
          const parentRect = currentNode.getBoundingClientRect();

          if (
            rect.bottom < parentRect.top ||
            rect.top > parentRect.bottom ||
            rect.right < parentRect.left ||
            rect.left > parentRect.right
          ) {
            return true;
          }
        }
      }
      currentNode = currentNode.parentElement;
    }

    return false;
  }

  /**
   * Check if element is hidden by an overlay
   */
  function isHiddenByOverlay(element: Element, rect: DOMRect): boolean {
    const elementAtPoint = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );

    if (!elementAtPoint) {
      return true;
    }

    if (!isElementOrParent(element, elementAtPoint)) {
      return isCoveredByModalOrOverlay(elementAtPoint);
    }

    return false;
  }

  /**
   * Check if target is the element or one of its parents
   */
  function isElementOrParent(element: Element, target: Element): boolean {
    let node: Element | null = target;
    while (node) {
      if (node === element) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  /**
   * Check if the covering element is a modal/overlay
   */
  function isCoveredByModalOrOverlay(coveringElement: Element): boolean {
    let current: Element | null = coveringElement;

    while (current) {
      if (current instanceof HTMLElement) {
        const coverStyle = window.getComputedStyle(current);

        if (
          (current.hasAttribute("role") &&
            ["dialog", "modal", "alertdialog", "popover"].includes(
              current.getAttribute("role") || ""
            )) ||
          coverStyle.getPropertyValue("position") === "fixed" ||
          parseInt(coverStyle.getPropertyValue("z-index") || "0") > 10
        ) {
          return true;
        }
      }
      current = current.parentElement;
    }

    return false;
  }

  /**
   * Find all interactive elements on the page
   */
  function findInteractiveElements(): Element[] {
    // Get all elements that match our selectors
    const elements = [
      ...document.querySelectorAll(INTERACTIVE_SELECTORS.join(",")),
    ];

    // Filter for truly visible elements using our enhanced visibility check
    const visibleElements = elements.filter(isElementTrulyVisible);

    // Filter out parent elements that contain other interactive elements
    return filterNestedInteractiveElements(visibleElements);
  }

  /**
   * Filter out parent elements when both parent and child are interactive
   */
  function filterNestedInteractiveElements(elements: Element[]): Element[] {
    const elementSet = new Set(elements);
    const elementsToRemove = new Set<Element>();

    for (const element of elements) {
      if (elementsToRemove.has(element)) continue;

      let parent = element.parentElement;
      let levels = 0;

      while (parent && levels < 3) {
        if (elementSet.has(parent)) {
          if (isCalendarElement(parent)) {
            elementsToRemove.add(parent);
          } else if (isChildDominantInParent(element, parent)) {
            elementsToRemove.add(parent);
          }
        }

        parent = parent.parentElement;
        levels++;
      }
    }

    return elements.filter((element) => !elementsToRemove.has(element));
  }

  /**
   * Check if element is a calendar component
   */
  function isCalendarElement(element: Element): boolean {
    return (
      element.hasAttribute("role") &&
      (element.getAttribute("role") === "gridcell" ||
        element.hasAttribute("data-date") ||
        element.hasAttribute("data-iso"))
    );
  }

  /**
   * Check if child element takes up most of the parent's area
   */
  function isChildDominantInParent(child: Element, parent: Element): boolean {
    const parentRect = parent.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();

    const parentArea = parentRect.width * parentRect.height;
    const childArea = childRect.width * childRect.height;

    return childArea / parentArea > 0.7;
  }

  /**
   * Optimize label positions to avoid overlaps
   */
  function optimizeLabelPositions(elementData: ElementData[]): void {
    // Sort elements by size, process smaller elements first
    elementData.sort((a, b) => {
      const areaA = a.rect.width * a.rect.height;
      const areaB = b.rect.width * b.rect.height;
      return areaA - areaB;
    });

    // Keep track of occupied spaces for labels
    const occupiedSpaces: OccupiedSpace[] = [];

    elementData.forEach((data) => {
      const rect = data.rect;
      const isSmallElement = rect.width < 30 || rect.height < 30;

      if (isSmallElement) {
        positionSmallElementLabel(data, rect, occupiedSpaces);
      } else {
        positionLargeElementLabel(data, rect);
      }
    });
  }

  /**
   * Position label for small elements like calendar cells
   */
  function positionSmallElementLabel(
    data: ElementData,
    rect: DOMRect,
    occupiedSpaces: OccupiedSpace[]
  ): void {
    // Try each anchor point in priority order
    for (const [xRatio, yRatio] of ANCHOR_POINTS) {
      const labelX =
        rect.left + window.scrollX + rect.width * xRatio - LABEL_WIDTH / 2;
      const labelY =
        rect.top + window.scrollY + rect.height * yRatio - LABEL_HEIGHT / 2;

      if (
        labelX < 0 ||
        labelY < 0 ||
        labelX + LABEL_WIDTH > window.innerWidth ||
        labelY + LABEL_HEIGHT > window.innerHeight
      ) {
        continue; // Skip if out of bounds
      }

      const labelRect: OccupiedSpace = {
        left: labelX,
        right: labelX + LABEL_WIDTH,
        top: labelY,
        bottom: labelY + LABEL_HEIGHT,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
      };

      if (!hasLabelOverlap(labelRect, occupiedSpaces)) {
        data.labelPosition = {
          x: labelX + LABEL_WIDTH / 2,
          y: labelY + LABEL_HEIGHT / 2,
          anchorX: rect.left + window.scrollX + rect.width / 2,
          anchorY: rect.top + window.scrollY + rect.height / 2,
        };

        occupiedSpaces.push(labelRect);
        return;
      }
    }

    // Fallback position
    data.labelPosition = {
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 16,
      anchorX: rect.left + window.scrollX + rect.width / 2,
      anchorY: rect.top + window.scrollY + rect.height / 2,
      transparent: true,
    };
  }

  /**
   * Check if label overlaps with any occupied spaces
   */
  function hasLabelOverlap(
    labelRect: OccupiedSpace,
    occupiedSpaces: OccupiedSpace[]
  ): boolean {
    return occupiedSpaces.some((space) => {
      return !(
        labelRect.right < space.left ||
        labelRect.left > space.right ||
        labelRect.bottom < space.top ||
        labelRect.top > space.bottom
      );
    });
  }

  /**
   * Position label for larger elements
   */
  function positionLargeElementLabel(data: ElementData, rect: DOMRect): void {
    data.labelPosition = {
      x: rect.left + window.scrollX + 5,
      y: rect.top + window.scrollY - 5,
      anchorX: null, // No connector line needed
      anchorY: null,
    };
  }

  /**
   * Highlight a single element with index number and optimized label position
   */
  function highlightElement(
    element: Element,
    index: number,
    labelPosition: LabelPosition,
    container: HTMLElement
  ): void {
    const rect = element.getBoundingClientRect();
    const color = COLORS[index % COLORS.length]!;

    const highlight = createHighlightBox(rect, color);
    const label = createNumberLabel(labelPosition, color, index);

    container.appendChild(highlight);
    container.appendChild(label);

    if (labelPosition.anchorX !== null && labelPosition.anchorY !== null) {
      const line = createConnectorLine(labelPosition, color);
      container.appendChild(line);
    }
  }

  /**
   * Create highlight box for an element
   */
  function createHighlightBox(rect: DOMRect, color: string): HTMLElement {
    const highlight = document.createElement("div");
    Object.assign(highlight.style, {
      position: "absolute",
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: `2px solid ${color}`,
      backgroundColor: `${color}1A`, // 10% opacity
      boxSizing: "border-box",
      zIndex: CONNECTOR_Z_INDEX,
    });
    return highlight;
  }

  /**
   * Create number label for an element
   */
  function createNumberLabel(
    labelPosition: LabelPosition,
    color: string,
    index: number
  ): HTMLElement {
    const label = document.createElement("div");
    Object.assign(label.style, {
      position: "absolute",
      top: `${labelPosition.y}px`,
      left: `${labelPosition.x}px`,
      backgroundColor: color,
      color: "white",
      fontSize: "10px", // Smaller font
      fontWeight: "bold",
      padding: "1px 4px", // Smaller padding
      borderRadius: "6px", // Smaller radius
      zIndex: MAX_Z_INDEX,
      transform: "translate(-50%, -50%)", // Center the label on its position
      opacity: labelPosition.transparent ? "0.7" : "1",
    });
    label.textContent = index.toString();
    return label;
  }

  /**
   * Create connector line between element and label
   */
  function createConnectorLine(
    labelPosition: LabelPosition,
    color: string
  ): HTMLElement {
    const line = document.createElement("div");

    // Calculate angle and length for the line
    const dx = labelPosition.x - labelPosition.anchorX!;
    const dy = labelPosition.y - labelPosition.anchorY!;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    Object.assign(line.style, {
      position: "absolute",
      top: `${labelPosition.anchorY}px`,
      left: `${labelPosition.anchorX}px`,
      width: `${length}px`,
      height: "1px",
      backgroundColor: color,
      transform: `rotate(${angle}deg)`,
      transformOrigin: "0 0",
      zIndex: CONNECTOR_Z_INDEX,
    });

    return line;
  }

  (window as InjectedWindow).$$BrowserAgent = {
    highlightInteractiveElements,
    removeHighlightContainer,
  };
};
