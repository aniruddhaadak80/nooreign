import { describe, expect, it } from "vitest";

import {
  andThen,
  collectResults,
  err,
  isErr,
  isOk,
  mapResult,
  ok,
  partitionResults,
  unwrap,
} from "./result";

describe("result / constructors and guards", () => {
  it("narrows correctly with the type guards", () => {
    const good = ok(41);
    const bad = err("nope");
    expect(isOk(good)).toBe(true);
    expect(isErr(good)).toBe(false);
    expect(isOk(bad)).toBe(false);
    expect(isErr(bad)).toBe(true);

    if (isOk(good)) {
      // The narrowing is real: `value` only exists on the Ok branch.
      expect(good.value + 1).toBe(42);
    }
    if (isErr(bad)) {
      expect(bad.error).toBe("nope");
    }
  });
});

describe("result / unwrap", () => {
  it("returns the value, or throws the supplied message", () => {
    expect(unwrap(ok(7), "unreachable")).toBe(7);
    expect(() => unwrap(err("missing option"), "no such option")).toThrowError("no such option");
    expect(() => unwrap(err("x"), () => "lazy message")).toThrowError("lazy message");
  });
});

describe("result / mapResult", () => {
  it("transforms success and passes errors through untouched", () => {
    expect(mapResult(ok(2), (n) => n * 21)).toEqual(ok(42));
    const e = err("boom");
    expect(mapResult(e, (n: number) => n * 2)).toBe(e);
  });
});

describe("result / collectResults", () => {
  it("collects all successes", () => {
    expect(collectResults([ok(1), ok(2), ok(3)])).toEqual(ok([1, 2, 3]));
    expect(collectResults([])).toEqual(ok([]));
  });

  it("is all-or-nothing and reports the first error in argument order", () => {
    const first = err("first");
    const second = err("second");
    const combined = collectResults([ok(1), first, second]);
    expect(isErr(combined)).toBe(true);
    if (isErr(combined)) expect(combined.error).toBe("first");
  });
});

describe("result / partitionResults", () => {
  it("keeps going after a failure", () => {
    const p = partitionResults([ok(1), err("bad"), ok(3)]);
    expect(p.ok).toEqual([1, 3]);
    expect(p.errors).toEqual(["bad"]);
  });
});

describe("result / andThen", () => {
  it("threads values through chained fallible steps", () => {
    expect(andThen(ok(4), (n) => ok(n + 1))).toEqual(ok(5));
    expect(andThen(ok(4), () => err("stop"))).toEqual(err("stop"));
    expect(andThen(err("start"), () => ok(9))).toEqual(err("start"));
  });
});