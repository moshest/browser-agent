# Browser Agent

This is a simple browser agent that can be used to automate web browsing tasks. It uses the Playwright library to control a web browser and perform actions such as clicking buttons, filling out forms, and navigating to different pages.

Current version handles basic clicks on webpages and works with [Stagehand](https://stagehand.dev/) as executor agent. Performance is not guaranteed, and token usage is high via Stagehand. Researching better alternatives.

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
