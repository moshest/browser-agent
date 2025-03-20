import {
  chromium,
  devices,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { inject, type InjectedContext, type InjectedWindow } from "./inject.js";

let browser: Browser | null = null;
const contexts = new Set<BrowserContext>();

export type { BrowserContext };
export type BrowserPage = Page;

export const newBrowserContext = async (): Promise<BrowserContext> => {
  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      args: ["--disable-web-security"],
    });
  }

  const newContext = await browser.newContext({
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 1100 },
  });

  contexts.add(newContext);

  newContext.on("close", () => {
    contexts.delete(newContext);

    if (contexts.size === 0) {
      browser?.close();
      browser = null;
    }
  });

  return newContext;
};

const INJECT_SNIPPET = `(${inject.toString()})()`;

export const withBrowserPage = async <Fn extends keyof InjectedContext>(
  page: Page,
  fn: Fn
): Promise<ReturnType<InjectedContext[Fn]>> => {
  return page.evaluate(
    ({ fn, INJECT_SNIPPET }) => {
      let context = (window as InjectedWindow).$$BrowserAgent;
      if (!context) {
        eval(INJECT_SNIPPET);
        context = (window as InjectedWindow).$$BrowserAgent;

        if (!context) {
          throw new Error("Injected context not found");
        }
      }

      return context[fn]() as ReturnType<InjectedContext[Fn]>;
    },
    { fn, INJECT_SNIPPET }
  );
};

export const interactWithBrowser = async (
  page: Page,
  xpath: string,
  action: "click" | "type" | "keypress" | "scroll"
) => {
  const element = await page.$(xpath);
  if (!element) {
    throw new Error(`Element not found for xpath: ${xpath}`);
  }

  switch (action) {
    case "click":
      await element.click();
      break;
    case "type":
      await element.type("Hello World");
      break;
    case "keypress":
      await element.press("Enter");
      break;
    case "scroll":
      await element.evaluate((el) => el.scrollIntoView());
      break;
  }
};
