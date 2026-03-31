import { createServer } from "http";
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
 * MCP server
 */
const mcpServer = new Server(
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
 * Tools
 */
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
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
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "answer_with_feedback") {
    return {
      content: [
        {
          type: "json",
          data: {
            answer: `Echo: ${req.params.arguments?.question || ""}`,
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
 * UI
 */
mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      name: "feedback-ui",
      type: "ui",
      uri: "https://your-ui-url/index.html" // 🔥 replace
    }
  ]
}));

/**
 * Feedback endpoint (normal REST)
 */
app.post("/feedback", (req, res) => {
  console.log("🔥 FEEDBACK:", req.body);
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("MCP running 🚀");
});

/**
 * 🔥 CRITICAL: raw HTTP server (not Express route)
 */
const server = createServer((req, res) => {
  if (req.url === "/mcp") {
    const transport = new SSEServerTransport("/mcp", res);
    mcpServer.connect(transport);
    return;
  }

  app(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});