import { openai } from "@ai-sdk/openai";
import fs from "node:fs/promises";
import {
  AgentStateStep,
  type AgentState,
  type AgentStateModel,
  type AgentStateToolCall,
} from "./state.js";
import { generateText, type LanguageModelV1 } from "ai";
import { SYSTEM_PROMPT } from "./prompts.js";
import { analyze, elementInteraction, googleSearch, openURL } from "./tools.js";
import { toHistoryMessage, toSnapshotMessage } from "./messages.js";
import {
  withBrowserPage,
  newBrowserContext,
  type BrowserContext,
  type BrowserPage,
  interactWithBrowser,
} from "../browser/index.js";

export class Agent {
  private model: LanguageModelV1;
  private browserContext: Promise<BrowserContext> | null = null;
  private pages: BrowserPage[] = [];

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
  }

  async run(): Promise<void> {
    const nextStep = await this.next();
    console.log("Next step:", nextStep);

    this.state = {
      ...this.state,
      history: [...(this.state.history ?? []), nextStep],
    };

    switch (nextStep.tool) {
      case "analyze": {
        this.state.step = this.state.currentPage
          ? AgentStateStep.PAGE_INTERACTION
          : AgentStateStep.NEW_PAGE;
        break;
      }

      case "openURL": {
        const url = nextStep.args!.url;
        const page = await this.getPage();

        await page.goto(url);
        break;
      }

      case "googleSearch": {
        const query = nextStep.args!.query;
        const page = await this.getPage();

        await page.goto(
          `https://www.google.com/search?q=${encodeURIComponent(query)}`
        );
        break;
      }

      case "elementInteraction": {
        const index = nextStep.args!.index;
        const action = nextStep.args!.action;

        const page = await this.getPage();
        const xpath = this.state.currentPage?.elements.xpaths[index];

        if (!xpath) {
          throw new Error(`XPath not found for index ${index}`);
        }

        await interactWithBrowser(page, xpath, action);

        // console.info("Waiting for manual element interaction...");
        // await new Promise((resolve) => setTimeout(resolve, 10e3));

        // console.info("Assuming manual element interaction is done.");
      }
    }

    if (nextStep.tool !== "analyze") {
      // retrieve the current page (ie. a new tab was opened)
      const page = await this.getPage();
      await page.waitForLoadState();

      await withBrowserPage(page, "removeHighlightContainer");
      const snapshot = await page.screenshot();

      const elements = await withBrowserPage(
        page,
        "highlightInteractiveElements"
      );
      const elementsSnapshot = await page.screenshot();
      fs.writeFile("./assets/elements.png", elementsSnapshot);

      this.state = {
        ...this.state,
        step: AgentStateStep.ANALYZE,

        currentPage: {
          url: page.url(),
          elements: {
            xpaths: elements,
            snapshot: elementsSnapshot.toString("base64"),
          },
        },

        snapshots: {
          current: snapshot.toString("base64"),
          previous: this.state.snapshots?.current,
        },
      };
    }
  }

  private async next(): Promise<AgentStateToolCall> {
    const prevMessages = this.state.history?.slice(0, -1) ?? [];
    const currentMessages = this.state.history?.slice(-1) ?? [];

    const { toolCalls } = await generateText({
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
          ? this.state.currentPage &&
            this.state.step === AgentStateStep.PAGE_INTERACTION
            ? [toSnapshotMessage(this.state.currentPage.elements.snapshot)]
            : [toSnapshotMessage(this.state.snapshots.current)]
          : []),
      ],

      tools: this.getTools(),
      toolChoice: "required",
    });

    const toolCall = toolCalls[0]!;
    const { reasoning, ...args } = toolCall.args;

    return {
      tool: toolCall.toolName,
      args,
      reasoning,
    };
  }

  private getTools(): Record<
    string,
    | typeof analyze
    | typeof openURL
    | typeof googleSearch
    | typeof elementInteraction
  > {
    switch (this.state.step) {
      case AgentStateStep.ANALYZE: {
        return {
          analyze,
        };
      }

      case AgentStateStep.NEW_PAGE: {
        return {
          openURL,
          googleSearch,
        };
      }

      case AgentStateStep.PAGE_INTERACTION: {
        return {
          elementInteraction,
        };
      }
    }
  }

  private async getPage(): Promise<BrowserPage> {
    if (!this.browserContext) {
      this.browserContext = newBrowserContext();

      this.browserContext.then(
        (browserContext) => {
          browserContext.on("page", (page) => {
            this.pages.push(page);

            page.on("close", () => {
              const index = this.pages.indexOf(page);
              if (index === -1) {
                return;
              }

              this.pages.splice(index, this.pages.length - index);
            });
          });

          browserContext.on("close", () => {
            this.browserContext = null;
          });
        },
        () => {
          this.browserContext = null;
        }
      );
    }

    let page = this.pages.at(-1);

    if (!page) {
      page = await (await this.browserContext).newPage();
    }

    return page;
  }
}
