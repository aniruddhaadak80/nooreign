//! Deterministic pseudo-randomness.
//!
//! # Why the PRNG is hand-rolled
//!
//! The jitter that keeps Nooreign's advisors from being perfectly rational has
//! to be *reproducible across two languages*. `rand`'s algorithms change
//! between major versions, and `Math.random`-shaped output is not something a
//! TS parity test can check anyway. So this is a direct port of
//! `packages/core/src/util/rng.ts`: mulberry32 for the stream, FNV-1a for the
//! seed, and a `U+241F` separator between key parts so that `("ab", "c")` and
//! `("a", "bc")` cannot collide.

/// A 32-bit state generator with a full 2^32 period.
///
/// mulberry32 is four lines, has no hidden tables and is trivially portable,
/// which matters far more here than statistical sophistication.
///
/// The `u32` arithmetic below is bit-for-bit what `Math.imul` and `>>>` do in
/// JS: `wrapping_mul` is a truncating 32-bit multiply (the same operation
/// `Math.imul` performs before reinterpretation) and Rust's `>>` on `u32` is
/// the logical shift `>>>` performs on a JS number after coercion.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Rng {
    /// The 32-bit generator state.
    state: u32,
    /// The seed this stream was built from, kept so [`Rng::fork`] can rebuild
    /// a decorrelated child stream exactly as the TS `fork` does.
    seed: u32,
}

impl Rng {
    /// Build a stream directly from a 32-bit seed.
    #[must_use]
    pub fn new(seed: u32) -> Self {
        Rng { state: seed, seed }
    }

    /// The seed this stream was constructed from.
    #[must_use]
    pub fn seed(&self) -> u32 {
        self.seed
    }

    /// Uniform in `[0, 1)`.
    ///
    /// Port of the closure returned by `mulberry32` in
    /// `packages/core/src/util/rng.ts`.
    ///
    /// Named `next` to match the TS closure it ports rather than
    /// `Iterator::next` (this type is not an `Iterator`).
    #[allow(clippy::should_implement_trait)]
    pub fn next(&mut self) -> f64 {
        self.state = self.state.wrapping_add(0x6d2b_79f5);
        let mut t = self.state;
        t = (t ^ (t >> 15)).wrapping_mul(t | 1);
        t ^= t.wrapping_add((t ^ (t >> 7)).wrapping_mul(t | 61));
        f64::from(t ^ (t >> 14)) / 4_294_967_296.0
    }

    /// Uniform in `[min, max)`. A `max` below `min` collapses to `min`.
    pub fn range(&mut self, min: f64, max: f64) -> f64 {
        if max < min {
            return min;
        }
        min + self.next() * (max - min)
    }

    /// Uniform integer in `[min, max]`, both inclusive.
    pub fn int(&mut self, min: i64, max: i64) -> i64 {
        if max < min {
            return min;
        }
        // `next()` is in [0, 1), so the draw is in [min, max + 1) before flooring.
        min + (self.next() * ((max - min + 1) as f64)).floor() as i64
    }

    /// Box-Muller normal draw. An `sd <= 0` collapses to the mean.
    ///
    /// `u1` is shifted off zero because `ln(0)` is `-Infinity`.
    pub fn gaussian(&mut self, mean: f64, sd: f64) -> f64 {
        if sd <= 0.0 {
            return mean;
        }
        let mut u1 = self.next();
        if u1 < f64::EPSILON {
            u1 = f64::EPSILON;
        }
        let u2 = self.next();
        mean + sd * (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()
    }

    /// A decorrelated child stream derived from this one's seed plus `tag`.
    ///
    /// Port of the TS `fork`, which calls `createRng(seed, tag)` with the
    /// *hashed* numeric seed — hence the `u32` seed, not the original key parts.
    #[must_use]
    pub fn fork(&self, tag: &str) -> Rng {
        create_rng(i64::from(self.seed), &[RngPart::Text(tag)])
    }
}

/// Build a mulberry32 stream from a 32-bit seed.
///
/// Port of `mulberry32` in `packages/core/src/util/rng.ts`. The returned
/// [`Rng`] is the TS closure's state in struct form: `next()` is the body.
#[must_use]
pub fn mulberry32(seed: u32) -> Rng {
    Rng::new(seed)
}

/// FNV-1a, 32-bit.
///
/// Port of `hashString` in `packages/core/src/util/rng.ts`.
///
/// # Why UTF-16 code units
///
/// JS iterates a string by UTF-16 code unit (`charCodeAt`). Rust's `str::chars`
/// iterates by Unicode scalar value, which differs for anything outside the
/// Basic Multilingual Plane (an astral character is two code units in JS and
/// one `char` in Rust, producing different hashes). Iterating `encode_utf16()`
/// makes the two implementations agree on *every* string, including the
/// em-dashes and curly quotes in advisor prose.
///
/// Note also the asymmetry that the TS port inherits: the hash is only the XOR
/// of the high and low halves folded together at the end, so two distinct
/// strings can share a seed. That is acceptable here because the seed is mixed
/// with the numeric fixture seed and a stream collision is a harmless
/// coincidence of noise, never a correctness problem.
#[must_use]
pub fn hash_string(s: &str) -> u32 {
    let mut h: u32 = 0x811c_9dc5;
    for unit in s.encode_utf16() {
        h ^= u32::from(unit);
        h = h.wrapping_mul(0x0100_0193);
    }
    h
}

/// One component of a [`create_rng`] key.
///
/// TS accepts `string | number` parts and stringifies them with `String(p)`.
/// Modelling the two cases explicitly keeps the integer rendering honest:
/// Rust's `{}` for `i64` and JS's `String(number)` agree on every integer in
/// this engine's range, whereas they do *not* agree on floats, so a float seed
/// part has no representation here on purpose.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RngPart<'a> {
    /// A text component (a tag, an advisor id, an option id).
    Text(&'a str),
    /// An integer component, rendered exactly as `String(n)` would.
    Int(i64),
}

impl RngPart<'_> {
    /// Render this part the way `String(p)` would in JS.
    #[must_use]
    pub fn as_key_string(&self) -> String {
        match self {
            RngPart::Text(s) => (*s).to_string(),
            RngPart::Int(n) => n.to_string(),
        }
    }
}

/// The separator between key parts: `U+241F SYMBOL FOR UNIT SEPARATOR`.
///
/// A character that cannot appear in a normal id, so `("ab", "c")` and
/// `("a", "bc")` hash differently instead of colliding.
pub const KEY_SEPARATOR: char = '\u{241f}';

/// Build an [`Rng`] from a numeric seed plus any number of key parts.
///
/// Port of `createRng` in `packages/core/src/util/rng.ts`. The seed is part of
/// the hashed key (as it is in the TS original), so
/// `create_rng(1, &[Text("ab"), Text("c")])` and `create_rng(2, ...)` are
/// unrelated streams even with identical text parts.
#[must_use]
pub fn create_rng(seed: i64, parts: &[RngPart<'_>]) -> Rng {
    let mut joined = seed.to_string();
    for part in parts {
        joined.push(KEY_SEPARATOR);
        joined.push_str(&part.as_key_string());
    }
    mulberry32(hash_string(&joined))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_string_matches_the_published_fnv1a_32_test_vectors() {
        // The two constants every FNV-1a 32 implementation agrees on.
        assert_eq!(hash_string(""), 0x811c_9dc5);
        assert_eq!(hash_string("a"), 0xe40c_292c);
    }

    #[test]
    fn hash_string_matches_fnv1a_32_for_known_engine_tags() {
        // "r1" / "r2" / "r3" are the council's round tags; they must not collide.
        let r1 = hash_string("r1");
        let r2 = hash_string("r2");
        let r3 = hash_string("r3");
        assert_ne!(r1, r2);
        assert_ne!(r2, r3);
        assert_ne!(r1, r3);
        assert_eq!(hash_string("r1"), hash_string("r1"));
        assert_ne!(hash_string("kant"), hash_string("bentham"));
    }

    #[test]
    fn hash_string_is_order_sensitive_and_iterates_utf16_code_units() {
        assert_ne!(hash_string("ab"), hash_string("ba"));
        // An astral character is two UTF-16 code units, exactly as in JS.
        let emoji: String = "\u{1f600}".to_string();
        assert_eq!(emoji.encode_utf16().count(), 2);
        assert!(hash_string(&emoji) != 0);
        // Non-ASCII text still hashes stably.
        assert_eq!(hash_string("Königsberg"), hash_string("Königsberg"));
    }

    #[test]
    fn mulberry32_is_deterministic_and_reproducible_from_its_seed() {
        let a: Vec<f64> = {
            let mut r = mulberry32(20261011);
            (0..5).map(|_| r.next()).collect()
        };
        let b: Vec<f64> = {
            let mut r = mulberry32(20261011);
            (0..5).map(|_| r.next()).collect()
        };
        assert_eq!(a, b);
        assert_ne!(a, {
            let mut r = mulberry32(20261012);
            (0..5).map(|_| r.next()).collect::<Vec<f64>>()
        });
    }

    #[test]
    fn mulberry32_stays_inside_the_unit_interval() {
        let mut rng = mulberry32(7);
        for _ in 0..2_000 {
            let x = rng.next();
            assert!(x >= 0.0, "draw below zero: {x}");
            assert!(x < 1.0, "draw at or above one: {x}");
        }
    }

    #[test]
    fn mulberry32_is_reasonably_uniform() {
        // Deterministic bucket check: 4 streams of 1000 draws should not
        // collapse into a single bucket.
        let mut buckets = [0usize; 10];
        for seed in 0u32..4 {
            let mut rng = mulberry32(seed);
            for _ in 0..1_000 {
                let x = rng.next();
                let index = (x * 10.0) as usize;
                buckets[index.min(9)] += 1;
            }
        }
        for count in buckets {
            assert!(count > 200, "a decile collapsed: {buckets:?}");
        }
    }

    #[test]
    fn create_rng_separates_key_parts_so_near_misses_cannot_collide() {
        let a = create_rng(1, &[RngPart::Text("ab"), RngPart::Text("c")]);
        let b = create_rng(1, &[RngPart::Text("a"), RngPart::Text("bc")]);
        assert_ne!(a.seed(), b.seed());
        // The same parts in the same order are the same stream.
        assert_eq!(
            create_rng(1, &[RngPart::Text("ab"), RngPart::Text("c")]).seed(),
            a.seed()
        );
        // The numeric seed is part of the key.
        assert_ne!(
            create_rng(2, &[RngPart::Text("ab"), RngPart::Text("c")]).seed(),
            a.seed()
        );
    }

    #[test]
    fn create_rng_matches_the_ts_key_construction_by_hand() {
        // TS: createRng(seed, tag, advisorId, optionId)
        //   -> String(seed) + SEP + tag + SEP + advisorId + SEP + optionId
        let expected = hash_string("7\u{241f}r1\u{241f}kant\u{241f}halt");
        assert_eq!(
            create_rng(
                7,
                &[
                    RngPart::Text("r1"),
                    RngPart::Text("kant"),
                    RngPart::Text("halt"),
                ],
            )
            .seed(),
            expected
        );
    }

    #[test]
    fn range_and_int_respect_their_bounds() {
        let mut rng = mulberry32(99);
        for _ in 0..500 {
            let x = rng.range(0.25, 0.75);
            assert!((0.25..0.75).contains(&x), "out of range: {x}");
            let n = rng.int(1, 5);
            assert!((1..=5).contains(&n), "out of range: {n}");
        }
        // Inverted bounds collapse to the minimum, as in TS.
        assert_eq!(rng.range(1.0, 0.0), 1.0);
        assert_eq!(rng.int(5, 1), 5);
    }

    #[test]
    fn gaussian_collapses_to_the_mean_when_sd_is_not_positive() {
        let mut rng = mulberry32(3);
        assert_eq!(rng.gaussian(2.5, 0.0), 2.5);
        assert_eq!(rng.gaussian(2.5, -1.0), 2.5);
        // A real draw is finite and plausibly near the mean.
        let x = rng.gaussian(0.0, 1.0);
        assert!(x.is_finite());
        assert!(x.abs() < 10.0);
    }

    #[test]
    fn fork_derives_a_different_but_reproducible_child_stream() {
        let parent = create_rng(42, &[RngPart::Text("r1")]);
        let a = parent.fork("r2");
        let b = parent.fork("r2");
        assert_eq!(a.seed(), b.seed());
        assert_ne!(a.seed(), parent.seed());
        assert_ne!(a.seed(), parent.fork("r3").seed());
    }
}
