import {
  chromium,
  devices,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

let browser: Browser | null = null;
const contexts = new Set<BrowserContext>();

export type { BrowserContext };
export type BrowserPage = Page;

export const newBrowserContext = async () => {
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
