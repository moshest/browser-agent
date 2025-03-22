export interface AgentState {
  model: AgentStateModel;
  temperature: number;

  prompt: string;
  step: AgentStateStep;
  history?: AgentStateHistoryItem[];

  currentPage?: {
    url: string;
  };
  snapshots?: {
    current: AgentStateSnapshot;
    previous?: AgentStateSnapshot;
  };
}

export type AgentStateModel = "gpt-4o";

export enum AgentStateStep {
  ANALYZE = "ANALYZE",
  NEW_PAGE = "NEW_PAGE",
  PAGE_WAIT = "PAGE_WAIT",
  PAGE_INTERACTION = "PAGE_INTERACTION",
}

export type AgentStateHistoryItem =
  | AgentStateToolCall
  | AgentStateReasoning
  | AgentStateToolError;

export interface AgentStateToolCall {
  type: "tool_call";
  tool: string;
  args?: Record<string, any>;
  reasoning: string;
}

export interface AgentStateReasoning {
  type: "reasoning";
  reasoning: string;
}

export interface AgentStateToolError {
  type: "error";
  tool: string;
  error: string;
}

export type AgentStateSnapshot = Uint8Array | string;
