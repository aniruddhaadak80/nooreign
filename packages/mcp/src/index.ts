/**
 * Public surface of the MCP package: the server factory, its identity, and the
 * payload builders (re-exported so hosts can embed the same documents the
 * tools return without going through the protocol).
 */
export { createServer, SERVER_NAME, SERVER_VERSION } from "./server";
export {
  DEFAULT_BENCH,
  ToolError,
  buildAdvisors,
  buildCompare,
  buildConvene,
  buildDilemma,
  buildDilemmas,
  buildKingdoms,
  buildStress,
} from "./tools";
