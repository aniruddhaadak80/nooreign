//! A minimal JSON value and writer. No serde, no `std::collections::HashMap`.
//!
//! # Why this exists instead of a dependency
//!
//! The fixture this crate emits is the contract with the TypeScript engine, so
//! the serialiser has to be boring in a way a general-purpose one is not:
//!
//! * **Key order is insertion order**, never hash order. `BTreeMap` would sort
//!   keys alphabetically, which is stable but hides the document's structure;
//!   `HashMap` would be *non*-deterministic across runs. A vector of pairs gives
//!   the writer explicit control and makes byte-identical output trivially true.
//! * **Numbers are formatted by `f64`'s shortest round-trip `Display`.** Every
//!   number in the fixture has already been through
//!   [`crate::math::round4`], so it prints as `0.3393` rather than as
//!   `0.33930000000000002` or in exponent form. `JSON.parse` reads it back to
//!   the identical `double`, which is all the parity test needs.
//! * **`-0.0` is normalised to `0`**, because `JSON.stringify(-0)` is `"0"` and
//!   a negative zero in a fixture would be a byte-difference with no numerical
//!   meaning.
//! * **Non-finite numbers become `null`.** JSON has no `NaN` or `Infinity`, and
//!   the engine's rounding is defined to keep them out of a verdict; emitting
//!   `null` loudly is better than emitting invalid JSON.
//!
//! Parsing is deliberately *not* implemented. Nothing in this crate reads JSON
//! back; the consumer is `JSON.parse` in a TypeScript test, which is far better
//! at it.

/// A JSON value.
#[derive(Clone, Debug, PartialEq)]
pub enum Json {
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A JSON number written from an integer, so it never picks up a `.0`.
    Int(i64),
    /// A JSON number written from a double.
    Num(f64),
    /// A JSON string.
    Str(String),
    /// A JSON array.
    Arr(Vec<Json>),
    /// A JSON object, in insertion order.
    Obj(Vec<(String, Json)>),
}

impl Json {
    /// Build an object from `(&str, Json)` pairs, in the order given.
    ///
    /// A `Vec` rather than an array because several fixture nodes are built
    /// conditionally (a `utilonScale` entry appended only when there is a
    /// winner), and because the schema is defined in `README.md` rather than in
    /// a type-level list of fields.
    ///
    /// The keys are `&'static str` in practice — every call site in this crate
    /// uses a literal — which keeps the fixture's key set greppable against the
    /// schema documentation.
    #[must_use]
    pub fn obj(entries: Vec<(&str, Json)>) -> Json {
        Json::Obj(
            entries
                .into_iter()
                .map(|(key, value)| (key.to_string(), value))
                .collect(),
        )
    }

    /// Build an array.
    #[must_use]
    pub fn arr(items: Vec<Json>) -> Json {
        Json::Arr(items)
    }

    /// Build a string.
    ///
    /// Named `from_str` to match the fixture-builder call sites rather than
    /// `std::str::FromStr::from_str` (this type is not `FromStr`).
    #[must_use]
    #[allow(clippy::should_implement_trait)]
    pub fn from_str(value: &str) -> Json {
        Json::Str(value.to_string())
    }

    /// Build a string or `null`, for the many optional `kingdomId`-style fields.
    #[must_use]
    pub fn from_opt_str(value: Option<&str>) -> Json {
        match value {
            None => Json::Null,
            Some(text) => Json::Str(text.to_string()),
        }
    }

    /// Render as pretty-printed JSON with a trailing newline.
    ///
    /// Two spaces per level, `\n` line endings (never `\r\n` — the writer emits
    /// exactly the bytes it is given, so a Windows checkout cannot perturb the
    /// fixture's hash).
    #[must_use]
    pub fn to_pretty(&self) -> String {
        let mut out = String::new();
        self.write(&mut out, 0);
        out.push('\n');
        out
    }

    /// Render as compact JSON with no trailing newline.
    #[must_use]
    pub fn to_compact(&self) -> String {
        let mut out = String::new();
        self.write_compact(&mut out);
        out
    }

    /// Write the pretty form into `out` at `depth` levels of indentation.
    fn write(&self, out: &mut String, depth: usize) {
        match self {
            Json::Null => out.push_str("null"),
            Json::Bool(value) => out.push_str(if *value { "true" } else { "false" }),
            Json::Int(value) => out.push_str(&value.to_string()),
            Json::Num(value) => out.push_str(&format_number(*value)),
            Json::Str(value) => write_escaped(out, value),
            Json::Arr(items) => {
                if items.is_empty() {
                    out.push_str("[]");
                    return;
                }
                out.push_str("[\n");
                for (index, item) in items.iter().enumerate() {
                    indent(out, depth + 1);
                    item.write(out, depth + 1);
                    if index + 1 < items.len() {
                        out.push(',');
                    }
                    out.push('\n');
                }
                indent(out, depth);
                out.push(']');
            }
            Json::Obj(entries) => {
                if entries.is_empty() {
                    out.push_str("{}");
                    return;
                }
                out.push_str("{\n");
                for (index, (key, value)) in entries.iter().enumerate() {
                    indent(out, depth + 1);
                    write_escaped(out, key);
                    out.push_str(": ");
                    value.write(out, depth + 1);
                    if index + 1 < entries.len() {
                        out.push(',');
                    }
                    out.push('\n');
                }
                indent(out, depth);
                out.push('}');
            }
        }
    }

    /// Write the compact form into `out`.
    fn write_compact(&self, out: &mut String) {
        match self {
            Json::Null => out.push_str("null"),
            Json::Bool(value) => out.push_str(if *value { "true" } else { "false" }),
            Json::Int(value) => out.push_str(&value.to_string()),
            Json::Num(value) => out.push_str(&format_number(*value)),
            Json::Str(value) => write_escaped(out, value),
            Json::Arr(items) => {
                out.push('[');
                for (index, item) in items.iter().enumerate() {
                    if index > 0 {
                        out.push(',');
                    }
                    item.write_compact(out);
                }
                out.push(']');
            }
            Json::Obj(entries) => {
                out.push('{');
                for (index, (key, value)) in entries.iter().enumerate() {
                    if index > 0 {
                        out.push(',');
                    }
                    write_escaped(out, key);
                    out.push(':');
                    value.write_compact(out);
                }
                out.push('}');
            }
        }
    }
}

/// Format an `f64` as a JSON number.
fn format_number(value: f64) -> String {
    if !value.is_finite() {
        // JSON cannot express NaN or Infinity, and `round4` is defined to keep
        // them out of a verdict. A `null` here is a loud, parseable failure.
        return "null".to_string();
    }
    // `-0.0` and `0.0` are the same number and `JSON.stringify` renders both as
    // `0`, so they must agree here too.
    if value == 0.0 {
        return "0".to_string();
    }
    // Rust's `Display` for `f64` is the shortest string that round-trips, and
    // never uses exponent notation. Every fixture number has been through
    // `round4`, so this prints `0.3393`, not `3.3930000000000002e-1`.
    format!("{value}")
}

/// Write two spaces per level.
fn indent(out: &mut String, depth: usize) {
    for _ in 0..depth {
        out.push_str("  ");
    }
}

/// Write a JSON string literal, escaping exactly what RFC 8259 requires.
///
/// Non-ASCII is emitted as raw UTF-8 rather than as `\uXXXX`. That is valid
/// JSON, `JSON.parse` reads it identically, and the fixture stays readable —
/// the advisor claims in it are full of em-dashes and the word "Königsberg".
fn write_escaped(out: &mut String, value: &str) {
    out.push('"');
    for ch in value.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scalars_render_exactly_as_expected() {
        assert_eq!(Json::Null.to_compact(), "null");
        assert_eq!(Json::Bool(true).to_compact(), "true");
        assert_eq!(Json::Bool(false).to_compact(), "false");
        assert_eq!(Json::Int(0).to_compact(), "0");
        assert_eq!(Json::Int(20_261_011).to_compact(), "20261011");
        assert_eq!(Json::Int(-5).to_compact(), "-5");
        assert_eq!(Json::Num(0.3393).to_compact(), "0.3393");
        assert_eq!(Json::Num(1.0).to_compact(), "1");
        assert_eq!(Json::Num(0.0).to_compact(), "0");
        assert_eq!(Json::from_str("kant").to_compact(), "\"kant\"");
    }

    #[test]
    fn negative_zero_is_normalised_so_bytes_cannot_drift() {
        assert_eq!(Json::Num(-0.0).to_compact(), "0");
        assert_eq!(Json::Num(-0.0).to_compact(), Json::Num(0.0).to_compact());
    }

    #[test]
    fn non_finite_numbers_become_null_rather_than_invalid_json() {
        assert_eq!(Json::Num(f64::NAN).to_compact(), "null");
        assert_eq!(Json::Num(f64::INFINITY).to_compact(), "null");
        assert_eq!(Json::Num(f64::NEG_INFINITY).to_compact(), "null");
    }

    #[test]
    fn every_4dp_value_round_trips_through_its_shortest_representation() {
        // The engine's canonical precision, spelled out. If `round4` and
        // `format_number` ever disagree, this is where it shows.
        for value in [
            0.0, 0.0001, 0.25, 0.3393, 0.4011, 0.5, 0.5556, 0.615, 0.6667, 0.6833, 0.7010, 0.8788,
            0.95, 0.9837, 1.0,
        ] {
            let rendered = Json::Num(value).to_compact();
            let parsed: f64 = rendered.parse().expect("a parseable number");
            assert_eq!(parsed, value, "{value} rendered as {rendered}");
            assert!(!rendered.contains('e'), "{value} went exponential");
            assert!(!rendered.contains("inf"), "{value} went infinite");
            assert!(!rendered.contains("NaN"), "{value} went NaN");
        }
    }

    #[test]
    fn strings_escape_exactly_what_the_spec_requires() {
        assert_eq!(Json::from_str("a\"b\\c").to_compact(), "\"a\\\"b\\\\c\"");
        assert_eq!(
            Json::from_str("line\nbreak\ttab").to_compact(),
            "\"line\\nbreak\\ttab\""
        );
        assert_eq!(Json::from_str("\u{1}").to_compact(), "\"\\u0001\"");
        // Non-ASCII stays raw UTF-8: valid JSON, and readable in the fixture.
        assert_eq!(Json::from_str("Königsberg").to_compact(), "\"Königsberg\"");
        assert_eq!(
            Json::from_str("rights — before agency").to_compact(),
            "\"rights — before agency\""
        );
    }

    #[test]
    fn arrays_and_objects_render_in_insertion_order() {
        let node = Json::obj(vec![
            ("zebra", Json::Int(1)),
            ("alpha", Json::Int(2)),
            ("middle", Json::Int(3)),
        ]);
        // Insertion order, not alphabetical and not hash order.
        assert_eq!(node.to_compact(), "{\"zebra\":1,\"alpha\":2,\"middle\":3}");
    }

    #[test]
    fn empty_containers_render_on_one_line() {
        assert_eq!(Json::arr(Vec::new()).to_compact(), "[]");
        assert_eq!(Json::obj(Vec::new()).to_compact(), "{}");
        assert_eq!(Json::arr(Vec::new()).to_pretty(), "[]\n");
        assert_eq!(Json::obj(Vec::new()).to_pretty(), "{}\n");
    }

    #[test]
    fn optional_strings_become_null_not_the_empty_string() {
        assert_eq!(Json::from_opt_str(None).to_compact(), "null");
        assert_eq!(
            Json::from_opt_str(Some("kg-citadel")).to_compact(),
            "\"kg-citadel\""
        );
    }

    #[test]
    fn pretty_output_ends_with_exactly_one_newline() {
        let node = Json::obj(vec![("a", Json::Int(1))]);
        let pretty = node.to_pretty();
        assert!(pretty.ends_with("}\n"));
        assert!(!pretty.ends_with("\n\n"));
        assert!(!pretty.contains('\r'));
        // Two spaces per level.
        assert!(pretty.starts_with("{\n  \"a\": 1\n}\n"));
    }

    #[test]
    fn nested_containers_indent_correctly() {
        let node = Json::obj(vec![(
            "outer",
            Json::obj(vec![("inner", Json::arr(vec![Json::Int(1), Json::Int(2)]))]),
        )]);
        let pretty = node.to_pretty();
        assert_eq!(
            pretty,
            "{\n  \"outer\": {\n    \"inner\": [\n      1,\n      2\n    ]\n  }\n}\n"
        );
        // No trailing commas: the comma always precedes a newline inside a
        // container, never sits after one at a closer.
        assert!(!pretty.contains(",\n]"));
        assert!(!pretty.contains(",\n}"));
        assert_eq!(node.to_compact(), "{\"outer\":{\"inner\":[1,2]}}");
    }

    #[test]
    fn rendering_the_same_value_twice_is_byte_identical() {
        let node = Json::obj(vec![
            (
                "b",
                Json::arr(vec![
                    Json::Num(0.1),
                    Json::Num(0.2),
                    Json::Num(0.30000000000000004),
                ]),
            ),
            ("a", Json::from_opt_str(None)),
            ("c", Json::obj(vec![("d", Json::Bool(false))])),
        ]);
        assert_eq!(node.to_pretty(), node.to_pretty());
        assert_eq!(node.to_compact(), node.to_compact());
    }
}
