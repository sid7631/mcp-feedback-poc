import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();
app.use(express.json());

/**
 * Create MCP server
 */
const server = new Server(
  {
    name: "feedback-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * Register tool
 */
server.setRequestHandler("tools/list", async () => {
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
 * Handle tool call
 */
server.setRequestHandler("tools/call", async (request) => {
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
 * Register resources (UI)
 */
server.setRequestHandler("resources/list", async () => {
  return {
    resources: [
      {
        name: "feedback-ui",
        type: "ui",
        uri: "https://your-domain.com/index.html" // 🔥 replace
      }
    ]
  };
});

/**
 * SSE endpoint (THIS is what ChatGPT connects to)
 */
app.get("/mcp", async (req, res) => {
  const transport = new SSEServerTransport("/mcp", res);
  await server.connect(transport);
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