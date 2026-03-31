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
 * 🔥 Store sessions
 */
const sessions = new Map();

/**
 * 🔧 Create MCP server instance
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

  // resources/list
  mcp.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        name: "feedback-ui",
        type: "ui",
        uri: "https://feedback-widget-sid.netlify.app/" // 🔥 REPLACE THIS
      }
    ]
  }));

  return mcp;
}

/**
 * 🚀 HTTP server
 */
const server = createServer((req, res) => {
if (req.url.startsWith("/mcp")) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");

  let mcp;

  // ✅ reuse existing session
  if (sessionId && sessions.has(sessionId)) {
    mcp = sessions.get(sessionId);
  } else {
    // ✅ create new session
    mcp = createMCPServer();
  }

  const transport = new SSEServerTransport("/mcp", res);

  // 🔥 CRITICAL: register BEFORE connect
  transport.onSessionCreated = (id) => {
    console.log("✅ Session created:", id);
    sessions.set(id, mcp);
  };

  transport.onClose = () => {
    console.log("❌ Session closed");
    for (const [key, value] of sessions.entries()) {
      if (value === mcp) {
        sessions.delete(key);
      }
    }
  };

  mcp.connect(transport).catch((err) => {
    console.error("MCP error:", err);
    res.end();
  });

  return;
}

  // health check
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MCP running 🚀");
});

/**
 * ▶️ Start server
 */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});