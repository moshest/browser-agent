import type { CoreMessage } from "ai";
import type { AgentStateSnapshot, AgentStateToolCall } from "./state.js";

export const toHistoryMessage = (
  historyItem: AgentStateToolCall
): CoreMessage => {
  const { tool, args, reasoning } = historyItem;
  const entries = Object.entries(args ?? {});

  return {
    role: "assistant",
    content: `\`[${tool}]\`: ${reasoning}${
      entries.length > 0
        ? `\n\n${entries.map(([key, value]) => `${key}: ${value}`).join("\n")}`
        : ""
    }`,
  };
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
