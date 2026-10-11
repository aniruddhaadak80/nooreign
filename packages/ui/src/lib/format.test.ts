import { describe, expect, it } from "vitest";
import {
  FORMAT_CURRENT_YEAR,
  formatCompact,
  formatConfidence,
  formatPercent,
  formatSigned,
  formatSpan,
  formatUtilons,
  formatYear,
  slugify,
  titleCase,
  truncate,
} from "./format";

describe("formatYear", () => {
  it("signs BCE years", () => {
    expect(formatYear(-350)).toBe("350 BCE");
    expect(formatYear(-1)).toBe("1 BCE");
  });

  it("signs AD years", () => {
    expect(formatYear(1986)).toContain("1986");
    expect(formatYear(1986)).toBe("1986 AD");
    expect(formatYear(0)).toBe("1 BCE");
  });

  it("collapses the present", () => {
    expect(formatYear(FORMAT_CURRENT_YEAR)).toBe("the present");
    expect(formatYear(FORMAT_CURRENT_YEAR + 5)).toBe("the present");
  });
});

describe("formatSpan", () => {
  it("formats single-year spans once", () => {
    expect(formatSpan(1914, 1914)).toBe("1914 AD");
  });

  it("formats same-sign and cross-sign spans", () => {
    expect(formatSpan(-384, -322)).toBe("384–322 BCE");
    expect(formatSpan(1914, 2018)).toBe("1914–2018 AD");
    expect(formatSpan(-50, 50)).toBe("50 BCE–50 AD");
  });

  it("reaches for the present on an open end", () => {
    expect(formatSpan(2016, null)).toBe("2016 AD–present");
    expect(formatSpan(-300, null)).toBe("300 BCE–present");
    expect(formatSpan(2010, FORMAT_CURRENT_YEAR)).toBe("2010 AD–present");
  });
});

describe("numbers", () => {
  it("formats percentages of a fraction", () => {
    expect(formatPercent(0.42)).toBe("42%");
    expect(formatPercent(0.4237, 2)).toBe("42.37%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("always signs deltas", () => {
    expect(formatSigned(0.4)).toBe("+0.40");
    expect(formatSigned(-0.4)).toBe("−0.40");
    expect(formatSigned(0)).toBe("±0.00");
  });

  it("compacts large magnitudes", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(12400)).toBe("12.4K");
    expect(formatCompact(3_420_000)).toBe("3.42M");
    expect(formatCompact(-2_700_000_000)).toBe("−2.7B");
  });

  it("names the unit for utilons", () => {
    expect(formatUtilons(3_420_000)).toBe("3.42M utilons");
  });

  it("bands confidence instead of faking precision", () => {
    expect(formatConfidence(0.1)).toBe("doubtful");
    expect(formatConfidence(0.4)).toBe("tentative");
    expect(formatConfidence(0.7)).toBe("confident");
    expect(formatConfidence(0.95)).toBe("settled");
  });
});

describe("text", () => {
  it("truncates only past the limit", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a longer council sentence", 14)).toBe("a longer…");
    expect(truncate("anything", 0)).toBe("");
  });

  it("title cases across separators without losing the separator", () => {
    expect(titleCase("the kingdoms of mind")).toBe("The Kingdoms Of Mind");
    expect(titleCase("court of the well-keepers")).toBe("Court Of The Well-Keepers");
  });
});

describe("slugify", () => {
  it("folds Nordic diacritics to ASCII", () => {
    const slug = slugify("Søren Kierkegård");
    expect(slug).toBe("soren-kierkegard");
    expect([...slug].every((character) => (character.codePointAt(0) ?? 0) < 128)).toBe(true);
  });

  it("transliterates Greek and romanised philosopher names", () => {
    expect(slugify("Πλάτων")).toBe("platon");
    expect(slugify("Ἀριστοτέλης")).toBe("aristoteles");
    expect(slugify("Kant, Immanuel")).toBe("kant-immanuel");
  });

  it("collapses punctuation runs and trims separators", () => {
    expect(slugify("  Utilitarianism — a   study!! ")).toBe("utilitarianism-a-study");
  });
});