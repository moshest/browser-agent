import "dotenv/config";
import { Agent } from "./agent/index.js";

const agent = Agent.create({
  prompt: `check the cheapest flight from NYC to anywhere for tomorrow evening (${new Date().toDateString()}), departing after 5 PM`,
});

while (true) {
  await agent.run().catch((error) => {
    console.error("Error:", error);
  });
}

// # pnpm build && node dist/index.js
