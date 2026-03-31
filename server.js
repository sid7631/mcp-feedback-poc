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
 * ✅ Feedback endpoint (your UI will call this)
 */
app.post("/feedback", (req, res) => {
  console.log("🔥 FEEDBACK:", req.body);
  res.json({ ok: true });
});

/**
 * ✅ Health check
 */
app.get("/", (req, res) => {
  res.send("MCP running 🚀");
});

/**
 * ✅ HTTP server (MCP + Express)
 */
const server = createServer((req, res) => {
  // 🔥 MCP endpoint
  if (req.url === "/mcp") {
    // ✅ NEW server instance per connection (CRITICAL)
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
     * ✅ tools/list
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

    /**
     * ✅ tools/call
     */
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
     * ✅ resources/list (UI mapping)
     */
    mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          name: "feedback-ui",
          type: "ui",
          uri: "https://feedback-widget-sid.netlify.app/" // 🔥 REPLACE THIS
        }
      ]
    }));

    /**
     * ✅ SSE transport (ChatGPT connects here)
     */
    const transport = new SSEServerTransport("/mcp", res);

    mcpServer.connect(transport).catch((err) => {
      console.error("❌ MCP error:", err);
      res.end();
    });

    return;
  }

  // fallback to express
  app(req, res);
});

/**
 * ✅ Start server
 */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});