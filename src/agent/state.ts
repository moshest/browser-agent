export interface AgentState {
  model: AgentStateModel;
  temperature: number;

  prompt: string;
  step: AgentStateStep;
  history?: AgentStateToolCall[];

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
  PAGE_INTERACTION = "PAGE_INTERACTION",
}

export interface AgentStateToolCall {
  tool: string;
  args?: Record<string, any>;
  reasoning: string;
}

export type AgentStateSnapshot = Uint8Array | string;
