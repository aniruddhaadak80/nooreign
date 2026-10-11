//! Writes `crates/engine/fixtures/parity.json`.
//!
//! Run it with:
//!
//! ```text
//! cargo run --quiet --manifest-path crates/engine/Cargo.toml --bin fixtures
//! ```
//!
//! Optionally pass an output path as the first argument; the default is
//! `<manifest dir>/fixtures/parity.json`.
//!
//! # Determinism is the contract
//!
//! Running this twice must produce a byte-identical file, because that file is
//! the input to a TypeScript test that asserts the two engines agree. Two things
//! guarantee that, and neither is accidental:
//!
//! * the document is built from [`deliberation::parity_document`], which is a
//!   pure function of constants — no clock, no environment, no I/O ordering;
//! * the writer in [`nooreign_ethics::json`] emits keys in insertion order and
//!   formats numbers with `f64`'s shortest round-trip `Display`, so there is no
//!   hash-order or formatting-drift to guard against.
//!
//! The file is written with explicit `\n` bytes rather than through a
//! line-ending-translating writer, so a Windows checkout cannot perturb its hash.
//!
//! This binary is the one place in the crate where panicking is acceptable: it
//! has no callers, its failure modes are I/O failures, and a panic with a
//! readable message is better than a silently missing fixture.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use nooreign_ethics::deliberation::parity_document;

/// Where the fixture lives when no path is given on the command line.
fn default_output() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures")
        .join("parity.json")
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let output: PathBuf = args.get(1).map_or_else(default_output, PathBuf::from);

    if let Some(parent) = output.parent() {
        if let Err(error) = fs::create_dir_all(parent) {
            eprintln!("fixtures: could not create {}: {error}", parent.display());
            return ExitCode::FAILURE;
        }
    }

    let rendered = parity_document().to_pretty();

    if let Err(error) = fs::write(&output, rendered.as_bytes()) {
        eprintln!("fixtures: could not write {}: {error}", output.display());
        return ExitCode::FAILURE;
    }

    let bytes = rendered.len();
    let lines = rendered.lines().count();
    println!("wrote {} ({bytes} bytes, {lines} lines)", output.display());
    ExitCode::SUCCESS
}
