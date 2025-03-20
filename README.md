# Browser Agent

This is a simple browser agent that can be used to automate web browsing tasks. It uses the Playwright library to control a web browser and perform actions such as clicking buttons, filling out forms, and navigating to different pages.

Current version handles basic clicks on webpages and inspired by [BrowserUse](https://github.com/browser-use/browser-use) work. I'm researching on how to implement more complex actions handling calendar inputs and more sophisticated interactions.

## Installation

To install the required dependencies, run the following command:

```bash
pnpm install
pnpm build
```

## Configuration

Copy the `.env-example` file to `.env` and fill in the required values.

## Usage

To use the browser agent, you can run the following command:

```bash
node dist/index.js
```
