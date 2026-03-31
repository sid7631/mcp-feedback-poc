import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

/**
 * HTTP server
 */
const server = createServer((req, res) => {
  if (req.url.startsWith("/mcp")) {
    // 🔥 NEW server per connection (critical)
    const mcp = new Server(
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
    mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
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
     * tools/call
     */
    mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
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
     * resources/list
     */
    mcp.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          name: "feedback-ui",
          type: "ui",
          uri: "https://feedback-widget-sid.netlify.app/" // 🔥 REPLACE THIS
        }
      ]
    }));

    /**
     * SSE transport
     */
    const transport = new SSEServerTransport("/mcp", res);

    mcp.connect(transport).catch((err) => {
      console.error("MCP error:", err);
      res.end();
    });

    return;
  }

  // simple health response
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MCP running 🚀");
});

/**
 * Start server
 */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});