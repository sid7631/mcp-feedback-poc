import express from "express";
import { v4 as uuidv4 } from "uuid";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(express.json());

/**
 * ✅ Create MCP server
 */
const server = new Server(
  {
    name: "feedback-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

/**
 * ✅ List tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "answer_with_feedback",
        description: "Return answer with feedback UI",
        inputSchema: {
          type: "object",
          properties: {
            question: { type: "string" }
          },
          required: ["question"]
        }
      }
    ]
  };
});

/**
 * ✅ Call tool
 */
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "answer_with_feedback") {
    const question = req.params.arguments?.question || "";

    return {
      content: [
        {
          type: "json",
          data: {
            answer: `Echo: ${question}`,
            messageId: uuidv4(),
            _meta: {
              "openai/outputTemplate": "feedback-ui"
            }
          }
        }
      ]
    };
  }

  throw new Error("Unknown tool");
});

/**
 * ✅ List resources (UI)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        name: "feedback-ui",
        type: "ui",
        uri: "https://feedback-widget-sid.netlify.app" // 🔥 PUT YOUR REAL URL
      }
    ]
  };
});

/**
 * ✅ Proper MCP SSE endpoint (NO manual hacks)
 */
app.get("/mcp", async (req, res) => {
  const transport = new SSEServerTransport("/mcp", res);
  await server.connect(transport);
});

/**
 * ✅ Feedback endpoint (for your UI)
 */
app.post("/feedback", (req, res) => {
  console.log("🔥 FEEDBACK:", req.body);
  res.json({ ok: true });
});

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.send("MCP running 🚀");
});

/**
 * Railway port
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});