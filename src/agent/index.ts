import { openai } from "@ai-sdk/openai";
// import fs from "node:fs/promises";
import {
  AgentStateStep,
  type AgentState,
  type AgentStateHistoryItem,
  type AgentStateModel,
  type AgentStateToolCall,
} from "./state.js";
import { generateText, type LanguageModelV1 } from "ai";
import { SYSTEM_PROMPT } from "./prompts.js";
import { elementInteraction, googleSearch, openURL, wait } from "./tools.js";
import {
  ANALYZE_MESSAGE,
  toHistoryMessage,
  toSnapshotMessage,
} from "./messages.js";
import { Stagehand, type Page } from "@browserbasehq/stagehand";

export class Agent {
  private model: LanguageModelV1;
  private stagehand: Promise<Stagehand>;

  static create(opts: {
    prompt: string;
    model?: AgentStateModel;
    temperature?: number;
  }): Agent {
    return new Agent({
      model: opts.model ?? "gpt-4o",
      temperature: opts.temperature ?? 0,

      prompt: opts.prompt,
      step: AgentStateStep.ANALYZE,
    });
  }

  static fromState(state: AgentState): Agent {
    return new Agent(state);
  }

  private constructor(public state: AgentState) {
    this.model = openai(state.model);

    const stagehand = new Stagehand({
      env: "LOCAL",
      modelName: state.model,

      localBrowserLaunchOptions: {
        headless: false,
        args: ["--disable-web-security"],
      },
      logger: () => {},
    });

    this.stagehand = stagehand.init().then(() => stagehand);

    this.stagehand.catch(() => {
      // prevent unhandled promise rejection
    });
  }

  async run(): Promise<void> {
    const historyItem = await this.next();
    console.log("Next step:", historyItem);

    this.state = {
      ...this.state,
      history: [...(this.state.history ?? []), historyItem],
    };

    if (historyItem.type !== "tool_call") {
      this.state.step = this.state.currentPage
        ? AgentStateStep.PAGE_INTERACTION
        : AgentStateStep.NEW_PAGE;

      return;
    }

    try {
      await this.exec(historyItem);
    } catch (error) {
      console.error("Error executing tool:", error);

      this.state = {
        ...this.state,
        step: AgentStateStep.ANALYZE,
        history: [
          ...(this.state.history ?? []),
          {
            type: "error",
            tool: historyItem.tool,
            error: String((error as Error)?.message || error),
          },
        ],
      };

      return;
    }

    // retrieve the current page (ie. a new tab was opened)
    const page = await this.getPage();
    await page.waitForLoadState("networkidle", {
      timeout: 10e3, // 10 seconds
    });

    const snapshot = await page.screenshot();

    this.state = {
      ...this.state,
      step: AgentStateStep.ANALYZE,

      currentPage: { url: page.url() },

      snapshots: {
        current: snapshot.toString("base64"),
        previous: this.state.snapshots?.current,
      },
    };
  }

  async exec(toolCall: AgentStateToolCall): Promise<void> {
    switch (toolCall.tool) {
      case "openURL": {
        const url = toolCall.args!.url;
        const page = await this.getPage();

        await page.goto(url);
        break;
      }

      case "googleSearch": {
        const query = toolCall.args!.query;
        const page = await this.getPage();

        await page.goto(
          `https://www.google.com/search?q=${encodeURIComponent(query)}`
        );
        break;
      }

      case "wait": {
        const seconds = toolCall.args!.seconds;
        const page = await this.getPage();

        await page.waitForTimeout(seconds * 1000);
        break;
      }

      case "elementInteraction": {
        const action = toolCall.args!.action;
        const where = toolCall.args!.where;

        const page = await this.getPage();
        const [element] = await page.observe({
          instruction: where,
          modelName: "o3-mini",
        });

        if (!element) {
          throw new Error(`Element not found for instruction: ${where}`);
        }

        if (action !== "click") {
          // TODO: implement other actions
          throw new Error(`Unsupported action: ${action}`);
        }

        await page.click(element.selector, {
          timeout: 1e3, // 1 second
        });
      }
    }
  }

  private async next(): Promise<AgentStateHistoryItem> {
    const prevMessages = this.state.history?.slice(0, -1) ?? [];
    const currentMessages = this.state.history?.slice(-1) ?? [];

    console.log({
      prevMessages: prevMessages.length,
      currentMessages: currentMessages.length,
      step: this.state.step,
      currSnapshot: !!this.state.snapshots?.current,
      prevSnapshot: !!this.state.snapshots?.previous,
    });

    // await Promise.all([
    //   fs.writeFile("./assets/prev.png", this.state.snapshots?.previous ?? "", {
    //     encoding: "base64",
    //   }),
    //   fs.writeFile(
    //     "./assets/current.png",
    //     this.state.snapshots?.current ?? "",
    //     { encoding: "base64" }
    //   ),
    // ]);

    const { toolCalls, text } = await generateText({
      model: this.model,
      temperature: this.state.temperature,

      system: SYSTEM_PROMPT,

      messages: [
        {
          role: "user",
          content: this.state.prompt,
        },
        ...prevMessages.map((item) => toHistoryMessage(item)),

        ...(this.state.snapshots?.previous &&
        this.state.step === AgentStateStep.ANALYZE
          ? [toSnapshotMessage(this.state.snapshots.previous)]
          : []),

        ...currentMessages.map((item) => toHistoryMessage(item)),

        ...(this.state.snapshots
          ? [toSnapshotMessage(this.state.snapshots.current)]
          : []),

        ...(this.state.step === AgentStateStep.ANALYZE
          ? [ANALYZE_MESSAGE]
          : []),
      ],

      ...(this.state.step === AgentStateStep.ANALYZE
        ? {}
        : {
            tools: this.getTools(),
            toolChoice: "required",
          }),
    });

    if (this.state.step === AgentStateStep.ANALYZE) {
      return {
        type: "reasoning",
        reasoning: text,
      };
    }

    const toolCall = toolCalls[0]!;
    const { reasoning, ...args } = toolCall.args;

    return {
      type: "tool_call",
      tool: toolCall.toolName,
      reasoning,
      args,
    };
  }

  private getTools(): Record<
    string,
    | typeof openURL
    | typeof googleSearch
    | typeof wait
    | typeof elementInteraction
  > {
    switch (this.state.step) {
      case AgentStateStep.ANALYZE: {
        return {};
      }

      case AgentStateStep.NEW_PAGE: {
        return {
          openURL,
          // googleSearch, - causing problems with captcha
        };
      }

      case AgentStateStep.PAGE_WAIT: {
        return {
          wait,
        };
      }

      case AgentStateStep.PAGE_INTERACTION: {
        return {
          elementInteraction,
        };
      }
    }
  }

  private async getPage(): Promise<Page> {
    const stagehand = await this.stagehand;
    return stagehand.page;
  }
}
