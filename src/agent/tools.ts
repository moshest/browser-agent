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
    "Interact with a specific element on the webpage by referring to the number label shown near the element in the screenshot. The action must use the provided index that corresponds to the element's label.",
  parameters: z.object({
    reasoning: z
      .string()
      .describe(
        "Provide a detailed explanation for interacting with this element. Clearly indicate which of the element indexes is the correct one by referring to the number label that appears next to the element in the screenshot. Make sure to differentiate this label from any other shown numbers (e.g., in calendars) that might be present. Explain your reasoning thoroughly and state the expected outcome of this action."
      ),
    index: z
      .number()
      .int()
      .nonnegative()
      .describe(
        "The index corresponding to the element's number label as it appears in the screenshot. This label is used to uniquely identify the element for interaction."
      ),
    action: z
      .enum(["click", "type", "keypress", "scroll"])
      .describe(
        "Specify the exact action to perform on the element. Options include 'click' for a mouse click, 'type' for entering text, 'keypress' for simulating a key press, or 'scroll' for scrolling."
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
