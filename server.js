import express from "express";
import { v4 as uuidv4 } from "uuid";
import {
  createServer
} from "@modelcontextprotocol/sdk/server/index.js";

const app = express();
app.use(express.json());

/**
 * Create MCP server
 */
const mcpServer = createServer({
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
  ],

  resources: [
    {
      name: "feedback-ui",
      type: "ui",
      uri: "https://your-domain.com/index.html" // 🔥 replace this
    }
  ]
});

/**
 * Tool handler
 */
mcpServer.setRequestHandler("answer_with_feedback", async (req) => {
  const { question } = req;

  const messageId = uuidv4();

  return {
    content: [
      {
        type: "json",
        data: {
          answer: `Echo: ${question}`,
          messageId,
          _meta: {
            "openai/outputTemplate": "feedback-ui"
          }
        }
      }
    ]
  };
});

/**
 * Mount MCP server (this handles SSE automatically)
 */
app.use("/mcp", mcpServer);

/**
 * Feedback endpoint (for your UI button)
 */
app.post("/feedback", (req, res) => {
  console.log("🔥 FEEDBACK:", req.body);
  res.json({ ok: true });
});

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.send("MCP server running 🚀");
});

/**
 * Railway port
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});