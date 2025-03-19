import { tool } from "ai";
import * as z from "zod";

export const analyze = tool({
  description:
    "Analyze the current state of the webpage, assess the progress of the task, identify any missing elements, and determine the next steps to take.",
  parameters: z.object({
    reasoning: z
      .string()
      .describe(
        "A detailed explanation of the thought process behind the next action."
      ),
  }),
});

export const openURL = tool({
  description: "Open a URL in a web browser.",
  parameters: z.object({
    reasoning: z.string().describe("The reasoning for opening this URL."),
    url: z.string().url().describe("The URL to open."),
  }),
});

export const googleSearch = tool({
  description: "Search the web for information.",
  parameters: z.object({
    reasoning: z.string().describe("The reasoning for this search."),
    query: z.string().describe("The search query to execute on Google."),
  }),
});

export const elementInteraction = tool({
  description:
    "Interact with a specific element on the webpage using explicit, unambiguous instructions. Every detail must be included so another AI agent can execute the action with precision. Avoid vague terms—always use clear, specific language (e.g., 'click on the blue button labeled \"xyz\" on the left side of the page').",
  parameters: z.object({
    element: z
      .string()
      .describe(
        "Provide a comprehensive, unique description of the target element. Include specific attributes such as the exact text, color, position (e.g., 'on the left side of the page'), role, or any distinctive CSS classes/ids that ensure accurate identification. For example: 'blue button with label \"xyz\" on the left side of the page'."
      ),
    reasoning: z
      .string()
      .describe(
        "Clearly explain why interacting with this element is necessary. Describe the context and the expected outcome of the action to guide subsequent processing."
      ),
    action: z
      .enum(["click", "type", "keypress", "scroll"])
      .describe(
        "Specify the exact action to perform on the element. Options include: 'click' for a mouse click, 'type' for entering text, 'keypress' for simulating a key press, or 'scroll' for scrolling."
      ),
    text: z
      .string()
      .optional()
      .describe(
        "If the action is 'type', provide the exact text to input into the element. This text must be provided exactly as it should appear."
      ),
    pixels: z
      .number()
      .int()
      .optional()
      .describe(
        "If the action is 'scroll', specify the exact number of pixels to scroll. This number should be precise to ensure correct scrolling behavior."
      ),
    direction: z
      .enum(["up", "down", "left", "right"])
      .optional()
      .describe(
        "If the action is 'scroll', indicate the exact direction for scrolling."
      ),
    key: z
      .string()
      .optional()
      .describe(
        "If the action is 'keypress', specify the exact key to be pressed. This must be provided as the key’s literal value."
      ),
  }),
});
