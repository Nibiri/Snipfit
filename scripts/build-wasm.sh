#!/usr/bin/env bash
# Builds crates/sim-core to src/wasm/sim-core (wasm-bindgen --target web).
# Needs: rustup (nightly from rust-toolchain.toml is installed automatically)
#        and wasm-bindgen-cli of the same version as the wasm-bindgen crate.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRATE="$ROOT/crates/sim-core"
OUT="$ROOT/src/wasm/sim-core"
WB_VERSION="0.2.129"

if ! command -v wasm-bindgen >/dev/null || [[ "$(wasm-bindgen --version)" != *"$WB_VERSION"* ]]; then
  echo "Installing wasm-bindgen-cli $WB_VERSION..."
  cargo install wasm-bindgen-cli --version "$WB_VERSION" --locked
fi

cd "$CRATE"
cargo build --release
wasm-bindgen --target web --out-dir "$OUT" \
  "$CRATE/target/wasm32-unknown-unknown/release/sim_core.wasm"
# workerHelpers.js (wasm-bindgen-rayon) imports the package root ('../../..'),
# so give the output folder a package.json like wasm-pack would.
cat > "$OUT/package.json" <<'JSON'
{ "name": "sim-core", "type": "module", "main": "sim_core.js", "module": "sim_core.js", "types": "sim_core.d.ts", "sideEffects": ["./snippets/*"] }
JSON
echo "WASM built to $OUT"
