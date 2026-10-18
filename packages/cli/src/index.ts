/**
 * Public surface of the terminal package: the dispatcher, its usage text, and
 * the IO contract a host binds to.
 */
export { run, USAGE, VERSION } from "./cli";
export type { CliIO } from "./cli";
