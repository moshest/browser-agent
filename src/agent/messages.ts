import type { CoreMessage } from "ai";
import type {
  AgentStateHistoryItem,
  AgentStateSnapshot,
  AgentStateToolCall,
} from "./state.js";
import { ANALYZE_PROMPT } from "./prompts.js";

export const toHistoryMessage = (
  historyItem: AgentStateHistoryItem
): CoreMessage => {
  switch (historyItem.type) {
    case "error": {
      const { tool, error } = historyItem;
      return {
        role: "user",
        content: `\`[${tool}]\` Error: ${error}`,
      };
    }

    case "tool_call": {
      const { tool, args, reasoning } = historyItem;
      const entries = Object.entries(args ?? {});

      return {
        role: "assistant",
        content: `\`[${tool}]\`: ${reasoning}${
          entries.length > 0
            ? `\n\n${entries
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n")}`
            : ""
        }`,
      };
    }

    case "reasoning": {
      const { reasoning } = historyItem;
      return {
        role: "assistant",
        content: reasoning,
      };
    }
  }
};

export const toSnapshotMessage = (
  snapshot: AgentStateSnapshot
): CoreMessage => {
  return {
    role: "user",
    content: [
      {
        type: "image" as const,
        image: snapshot,
      },
    ],
  };
};

export const ANALYZE_MESSAGE = {
  role: "assistant" as const,
  content: ANALYZE_PROMPT,
} satisfies CoreMessage;
