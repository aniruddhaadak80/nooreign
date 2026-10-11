/**
 * A minimal `Result<T, E>`.
 *
 * WHY: the deliberation engine has exactly one failure mode that is *expected*
 * rather than exceptional — a malformed move, a dangling target, an empty
 * option list. Throwing would bury that in call stacks; returning `null` would
 * erase the reason. `Result` keeps both the value and the sentence explaining
 * why there isn't one, with no `any` and no exceptions.
 */

export type Result<T, E = string> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E = string>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Extract the value, or produce `fallbackMessage` as an error.
 * The fallback is a function so a caller can build the message lazily.
 */
export function unwrap<T, E>(result: Result<T, E>, fallbackMessage: string | (() => string)): T {
  if (isOk(result)) return result.value;
  const message = typeof fallbackMessage === "function" ? fallbackMessage() : fallbackMessage;
  throw new Error(message);
}

/** Transform the success value, leaving an error untouched. */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

/**
 * All-or-nothing combine. The first error in argument order wins, so the
 * reported failure is deterministic rather than whichever promise settled first.
 */
export function collectResults<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) return result;
    values.push(result.value);
  }
  return ok(values);
}

/**
 * Best-effort combine: successes pass through, errors are collected separately.
 * Useful for validation sweeps where one bad record must not hide the rest.
 */
export function partitionResults<T, E>(
  results: readonly Result<T, E>[],
): { ok: T[]; errors: E[] } {
  const values: T[] = [];
  const errors: E[] = [];
  for (const result of results) {
    if (isOk(result)) values.push(result.value);
    else errors.push(result.error);
  }
  return { ok: values, errors };
}

/** Fold a list of results into one, threading the value through `fn`. */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}