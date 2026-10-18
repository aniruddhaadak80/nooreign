#!/usr/bin/env bun
/**
 * The stdio binding. stdout carries the protocol, so every human-facing
 * sentence goes to stderr.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION, createServer } from "./server";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio`);
