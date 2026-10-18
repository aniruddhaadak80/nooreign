#!/usr/bin/env bun
/**
 * The `nooreign` binary: bind the dispatcher to the real streams and the real
 * exit code. Everything worth testing lives in `cli.ts`.
 */
import { run } from "./cli";

const code = await run(process.argv.slice(2), {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
});

process.exit(code);
