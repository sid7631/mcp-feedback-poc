import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { createHTTPServer } from "@modelcontextprotocol/sdk/server/http.js";

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import { v4 as uuidv4 } from "uuid";

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
server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
server.setRequestHandler(CallToolRequestSchema, async (req) => {
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
 * resources/list (UI)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      name: "feedback-ui",
      type: "ui",
      uri: "https://feedback-widget-sid.netlify.app/" // 🔥 REPLACE THIS
    }
  ]
}));

/**
 * 🔥 THIS is the key line
 */
createHTTPServer(server).listen(process.env.PORT || 3000, () => {
  console.log("MCP server running 🚀");
});