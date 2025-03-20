// // import type { Tool } from "openai/resources/responses/responses.mjs";
//
// export type AgentAction =
//   | AgentActionClickElement
//   | AgentActionScrollElement
//   | AgentActionTypeText;
//
// export type AgentActionClickElement = {
//   name: "click_element";
//   parameters: {
//     index: number;
//     element: string;
//   };
// };
// export const AgentActionClickElementDefinition: Tool = {
//   type: "function",
//   name: "click_element",
//   description: "Click on an element",
//   parameters: {
//     type: "object",
//     properties: {
//       index: {
//         type: "number",
//         description: "Index of the element to click on",
//       },
//       //   element: {
//       //     type: "string",
//       //     description: "Describe the element content or purpose",
//       //   },
//     },
//     required: ["index"],
//     additionalProperties: false,
//   },
//   strict: true,
// };
//
// export type AgentActionScrollElement = {
//   name: "scroll_element";
//   parameters: {
//     index: number;
//     element: string;
//     direction: "up" | "down" | "left" | "right";
//     distance: number;
//   };
// };
// export const AgentActionScrollElementDefinition: Tool = {
//   type: "function",
//   name: "scroll_element",
//   description: "Scroll the web page",
//   parameters: {
//     type: "object",
//     properties: {
//       index: {
//         type: "number",
//         description: "Index of the element to scroll on",
//       },
//       //   element: {
//       //     type: "string",
//       //     description: "Describe the element content or purpose",
//       //   },
//       direction: {
//         type: "string",
//         enum: ["up", "down", "left", "right"],
//         description: "Direction to scroll",
//       },
//       distance: {
//         type: "number",
//         description: "Distance to scroll in pixels",
//       },
//     },
//     required: ["index", "direction", "distance"],
//     additionalProperties: false,
//   },
//   strict: true,
// };
//
// export type AgentActionTypeText = {
//   name: "type_text";
//   parameters: {
//     index: number;
//     element: string;
//     text: string;
//   };
// };
// export const AgentActionTypeTextDefinition: Tool = {
//   type: "function",
//   name: "type_text",
//   description: "Input text into an element",
//   parameters: {
//     type: "object",
//     properties: {
//       index: {
//         type: "number",
//         description: "Index of the element to type text into",
//       },
//       //   element: {
//       //     type: "string",
//       //     description: "Describe the element content or purpose",
//       //   },
//       text: {
//         type: "string",
//         description: "Text to input into the element",
//       },
//     },
//     required: ["index", "text"],
//     additionalProperties: false,
//   },
//   strict: true,
// };
//
// export const stringifyAgentAction = (action: AgentAction): string => {
//   switch (action.name) {
//     case "click_element":
//       return `Clicked on element ${action.parameters.element} (#${action.parameters.index})`;
//     case "scroll_element":
//       return `Scrolled ${action.parameters.direction} on element ${action.parameters.element} (#${action.parameters.index}) by ${action.parameters.distance}px`;
//     case "type_text":
//       return `Typed "${action.parameters.text}" into element ${action.parameters.element} (#${action.parameters.index})`;
//   }
// };
