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
 * Store sessions: sessionId -> SSEServerTransport
 */
const sessions = new Map();

/**
 * Create MCP server instance
 */
function createMCPServer() {
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

  // tools/list
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

  // tools/call
  mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name === "answer_with_feedback") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              answer: `Echo: ${req.params.arguments?.question || ""}`,
              messageId: uuidv4(),
              _meta: {
                "openai/outputTemplate": "feedback-ui"
              }
            })
          }
        ]
      };
    }

    throw new Error("Unknown tool");
  });

  // resources/list
  mcp.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        name: "feedback-ui",
        uri: "https://feedback-widget-sid.netlify.app/"
      }
    ]
  }));

  return mcp;
}

/**
 * HTTP server
 */
const server = createServer(async (req, res) => {
  if (req.url.startsWith("/mcp")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");

    // GET: establish new SSE connection
    if (req.method === "GET") {
      const mcp = createMCPServer();
      const transport = new SSEServerTransport("/mcp", res);

      transport.onclose = () => {
        console.log("SESSION CLOSED:", transport.sessionId);
        sessions.delete(transport.sessionId);
      };

      await mcp.connect(transport);
      sessions.set(transport.sessionId, transport);
      console.log("SESSION CREATED:", transport.sessionId);
      return;
    }

    // POST: route message to existing session
    if (req.method === "POST") {
      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(400);
        res.end("Unknown session");
        return;
      }

      const transport = sessions.get(sessionId);
      await transport.handlePostMessage(req, res);
      return;
    }
  }

  // health check
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MCP running 🚀");
});

/**
 * Start server
 */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
