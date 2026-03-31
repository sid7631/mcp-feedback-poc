import express from "express";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

/**
 * MCP: Health check (useful for Railway)
 */
app.get("/", (req, res) => {
  res.send("MCP server is running 🚀");
});

/**
 * MCP: List tools
 */
app.get("/tools", (req, res) => {
  res.json({
    tools: [
      {
        name: "answer_with_feedback",
        description: "Return answer with feedback UI",
        input_schema: {
          type: "object",
          properties: {
            question: { type: "string" }
          },
          required: ["question"]
        }
      }
    ]
  });
});

/**
 * MCP: List resources (UI registration)
 */
app.get("/resources", (req, res) => {
  res.json({
    resources: [
      {
        name: "feedback-ui",
        type: "ui",
        uri: "https://feedback-widget-sid.netlify.app" // 🔥 replace this
      }
    ]
  });
});

/**
 * MCP: Tool handler
 */
app.post("/tools/answer_with_feedback", (req, res) => {
  const { question } = req.body || {};

  const messageId = uuidv4();

  res.json({
    answer: `Echo: ${question || "no question provided"}`,
    messageId,
    _meta: {
      "openai/outputTemplate": "feedback-ui"
    }
  });
});

/**
 * Feedback endpoint (for your UI button)
 */
app.post("/feedback", (req, res) => {
  console.log("🔥 FEEDBACK RECEIVED:", req.body);

  res.json({
    ok: true,
    received: req.body
  });
});

/**
 * 🚨 IMPORTANT: Use dynamic port (Railway requirement)
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
});