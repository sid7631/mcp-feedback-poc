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
 * tools/list
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
 * tools/call
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "answer_with_feedback") {
    const question = request.params.arguments?.question;

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
 * resources/list
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        name: "feedback-ui",
        type: "ui",
        uri: "https://feedback-widget-sid.netlify.app" // 🔥 replace
      }
    ]
  };
});

/**
 * SSE endpoint
 */
app.get("/mcp", async (req, res) => {
  // REQUIRED headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // flush headers immediately
  res.flushHeaders?.();

  const transport = new SSEServerTransport("/mcp", res);

  try {
    await server.connect(transport);
  } catch (err) {
    console.error("❌ MCP connection error:", err);
    res.end();
  }
});

/**
 * Feedback endpoint
 */
app.post("/feedback", (req, res) => {
  console.log("🔥 FEEDBACK:", req.body);
  res.json({ ok: true });
});

/**
 * Health
 */
app.get("/", (req, res) => {
  res.send("MCP running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});