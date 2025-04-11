import cors from "cors";
import express, { Express } from "express";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { type Tool } from "./types";
import { name, version } from "../package.json";
import { zodToJsonSchema } from "zod-to-json-schema";

const createMCPServer = (toolsArray: Tool[]) => {
  const server = new Server(
    {
      name,
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // convert the inputSchema to a json schema
  const tools = toolsArray.map((tool) => ({
    ...tool,
    inputSchema: zodToJsonSchema(tool.inputSchema),
  }));

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const toolDefinition = toolsArray.find((t) => t.name === name);

    if (!toolDefinition) {
      throw new Error(`Tool ${name} not found`);
    }

    const params = toolDefinition.inputSchema.parse(args);
    const result = await toolDefinition.execute(params);

    // Simple text response
    return {
      content: [
        {
          type: "text",
          text:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  return server;
};

export function createApp(toolsArray: Tool[]): Express {
  // Store active transports by sessionId
  const transports = new Map<string, SSEServerTransport>();

  // Create express app
  const app = express();

  // Create MCP server
  const mcpServer = createMCPServer(toolsArray);

  // Set up CORS
  app.use(cors({ maxAge: 84600 }));

  // Set up SSE endpoint
  app.get("/sse", async (req, res) => {
    console.log("SSE endpoint hit");

    // Simple auth based on API key
    if (req.headers.authorization !== `Bearer ${process.env.MCP_API_KEY}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Create a new transport for this connection
    const transport = new SSEServerTransport("/message", res);

    // Store the transport using its sessionId
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    console.log(`New connection established with sessionId: ${sessionId}`);

    // Clean up when connection closes
    res.on("close", () => {
      console.log(`Connection closed for sessionId: ${sessionId}`);
      transports.delete(sessionId);
    });

    await mcpServer.connect(transport);
  });

  // Set up MCP endpoint
  app.post("/message", async (req, res) => {
    const sessionId = req.query.sessionId as string;

    // Simple auth based on API key
    if (req.headers.authorization !== `Bearer ${process.env.MCP_API_KEY}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing sessionId" });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handlePostMessage(req, res);
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      activeConnections: transports.size,
    });
  });

  return app;
}
