import { createServer } from "http";
import { randomUUID } from "node:crypto";
import { v4 as uuidv4 } from "uuid";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod/v3";

const WIDGET_URI = "ui://widget/feedback.html";

const widgetHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Feedback</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body { width: 100%; height: 100%; background: transparent; }
    body { padding: 16px;}

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 4px 2px 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: #111;
    }

    /* Answer */

    .answer-wrap-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .answer-wrap {
      background: #f7f7f8;
      border-radius: 12px;
      padding: 13px 15px;
    }
    .answer-eyebrow {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: #9a9aaa;
      margin-bottom: 5px;
    }
    .answer-text {
      font-size: 14px;
      line-height: 1.65;
      color: #1c1c1e;
      word-break: break-word;
      min-height: 20px;
    }

    /* Divider */
    hr {
      border: none;
      border-top: 1px solid #ebebeb;
    }

    /* Prompt */
    .prompt {
      font-size: 13px;
      font-weight: 500;
      color: #3a3a4a;
    }

    /* Vote */
    .vote-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .vote-btn {
      background: #fff;
      border: 1.5px solid #e2e2e6;
      border-radius: 12px;
      padding: 9px 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #444;
      transition: border-color 0.15s, background 0.15s, transform 0.1s;
    }
    .vote-btn .icon { font-size: 17px; line-height: 1; }
    .vote-btn:hover { background: #f5f5f7; transform: translateY(-1px); }
    .vote-btn.active.up   { background: #f0fdf4; border-color: #4ade80; color: #15803d; }
    .vote-btn.active.down { background: #fff1f2; border-color: #f87171; color: #b91c1c; }

    /* Comment */
    textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #e2e2e6;
      border-radius: 12px;
      font-family: inherit;
      font-size: 13px;
      line-height: 1.5;
      resize: none;
      height: 68px;
      color: #111;
      background: #fff;
      transition: border-color 0.15s;
    }
    textarea:focus { outline: none; border-color: #adadb8; }
    textarea::placeholder { color: #c0c0cc; }

    /* Submit */
    .submit-btn {
      width: 100%;
      background: #18181b;
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 10px 0;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }
    .submit-btn:hover { background: #27272a; transform: translateY(-1px); }
    .submit-btn:active { transform: translateY(0); }
    .submit-btn:disabled { background: #d4d4d8; cursor: default; transform: none; }

    /* Status */
    .status {
      font-size: 12px;
      text-align: center;
      min-height: 16px;
      color: #888;
    }
    .status.success { color: #16a34a; font-weight: 500; }
    .status.error   { color: #dc2626; }
  </style>
</head>
<body>

<div class="answer-wrap-container">

  <div class="answer-wrap">
    <div class="answer-eyebrow">Answer</div>
    <div class="answer-text" id="answer-text">—</div>
  </div>

  <hr />

  <p class="prompt">Was this helpful?</p>

  <div class="vote-row">
    <button class="vote-btn up"   id="btn-up"   onclick="vote('up')">
      <span class="icon">👍</span> Yes
    </button>
    <button class="vote-btn down" id="btn-down" onclick="vote('down')">
      <span class="icon">👎</span> No
    </button>
  </div>

  <textarea id="comment" placeholder="Leave a comment (optional)…"></textarea>

  <button class="submit-btn" id="submit-btn" onclick="submitFeedback()">Send Feedback</button>

  <p class="status" id="status"></p>

</div>

  <script>
    let selected = null;

    function render(data) {
      const d = data || window.openai?.toolOutput;
      if (!d || !d.answer) return;
      const el = document.getElementById("answer-text");
      if (el) el.textContent = d.answer;
    }

    render();
    [100, 300, 600, 1200].forEach(ms => setTimeout(render, ms));

    window.addEventListener("openai:set_globals", (e) => {
      render(e.detail?.globals?.toolOutput);
    }, { passive: true });

    function vote(type) {
      selected = type;
      document.getElementById("btn-up").classList.toggle("active", type === "up");
      document.getElementById("btn-down").classList.toggle("active", type === "down");
    }

    function submitFeedback() {
      const statusEl = document.getElementById("status");
      if (!selected) {
        statusEl.className = "status error";
        statusEl.textContent = "Please select 👍 or 👎 first.";
        return;
      }

      const d = window.openai?.toolOutput || {};
      const btn = document.getElementById("submit-btn");

      btn.disabled = true;
      statusEl.className = "status";
      statusEl.textContent = "Sending…";

      fetch("https://your-backend/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: d.messageId,
          feedback: selected,
          comment: document.getElementById("comment").value.trim()
        })
      })
        .then(() => {
          statusEl.className = "status success";
          statusEl.textContent = "✓ Thanks for your feedback!";
        })
        .catch(() => {
          btn.disabled = false;
          statusEl.className = "status error";
          statusEl.textContent = "Failed to send. Please try again.";
        });
    }
  </script>

</body>
</html>`.trim();

/**
 * Store sessions: sessionId -> { mcp, transport }
 */
const sessions = new Map();

/**
 * Create MCP server instance per session
 */
function createMCPServer() {
  const mcp = new McpServer(
    { name: "feedback-mcp", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  // Register the feedback widget HTML as an inline resource
  mcp.registerResource("feedback-widget", WIDGET_URI, {}, async () => ({
    contents: [
      {
        uri: WIDGET_URI,
        mimeType: "text/html;profile=mcp-app",
        text: widgetHtml,
        _meta: { ui: { prefersBorder: true } }
      }
    ]
  }));

  // 1) Data tool: processes the question, returns structuredContent only — no outputTemplate
  mcp.registerTool(
    "answer_question",
    {
      title: "Answer question",
      description: "Answer the user's question and return structured data. Always follow this with render_answer.",
      inputSchema: { question: z.string() },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        "openai/toolInvocation/invoking": "Thinking…",
        "openai/toolInvocation/invoked": "Answered."
      }
    },
    async ({ question }) => {
      const answer = `Echo: ${question}`;
      console.log("DATA TOOL:", { answer });
      return {
        structuredContent: { answer },
        content: [{ type: "text", text: "Answer ready." }]
      };
    }
  );

  // 2) Display tool: owns the widget template — call this after answer_question with its output
  mcp.registerTool(
    "render_answer",
    {
      title: "Render answer",
      description: "Render the answer widget. Call answer_question first, then pass its answer to this tool.",
      inputSchema: {
        answer: z.string()
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Displaying…",
        "openai/toolInvocation/invoked": "Displayed."
      }
    },
    async ({ answer }) => ({
      structuredContent: { answer, messageId: uuidv4() },
      content: [{ type: "text", text: "Widget rendered. Do not add any text after this — the widget is the full response to the user." }]
    })
  );

  return mcp;
}

/**
 * Add CORS headers — required for ChatGPT to reach the server
 */
function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
}

/**
 * HTTP server
 */
const server = createServer(async (req, res) => {
  setCORSHeaders(res);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/mcp" || req.url.startsWith("/mcp?")) {
    const sessionId = req.headers["mcp-session-id"];

    // Route to existing session
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId);
      await transport.handleRequest(req, res);
      return;
    }

    // New session — must be a POST (initialize request)
    if (req.method === "POST" && !sessionId) {
      const mcp = createMCPServer();

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { mcp, transport });
          console.log("SESSION CREATED:", id);
        }
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        console.log("SESSION CLOSED:", id);
        sessions.delete(id);
      };

      await mcp.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad request" }));
    return;
  }

  // Health check
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MCP running");
});

/**
 * Start server
 */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
  console.log(`Register in ChatGPT as: https://<your-domain>/mcp`);
});
