#!/usr/bin/env bash
# tsc-ratchet.sh — fail if the tsc --noEmit error count exceeds the frozen baseline.
#
# Usage: npm run type-check  (or: bash tsc-ratchet.sh)
#
# To intentionally raise the baseline after fixing errors:
#   COUNT=$(npx tsc --noEmit 2>&1 | grep -c ': error TS' || true)
#   echo "$COUNT" > tsc-error-baseline
#   git add tsc-error-baseline && git commit -m "chore(rn): lower tsc baseline to $COUNT"
#
# To intentionally raise the ceiling (adding a new dep that brings unavoidable errors):
#   Same as above — bump the number and commit with justification.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_FILE="$SCRIPT_DIR/tsc-error-baseline"

if [ ! -f "$BASELINE_FILE" ]; then
  echo "ERROR: tsc-error-baseline not found at $BASELINE_FILE" >&2
  exit 1
fi

BASELINE=$(tr -d '[:space:]' < "$BASELINE_FILE")

# tsc exits non-zero when errors exist; capture output regardless.
# grep -c exits 1 when count is 0 — || true keeps the script alive.
TSC_OUT=$(npx tsc --noEmit 2>&1 || true)
COUNT=$(echo "$TSC_OUT" | grep -c ': error TS' || true)

if [ "$COUNT" -gt "$BASELINE" ]; then
  echo "tsc ratchet FAILED: $COUNT errors (baseline: $BASELINE)" >&2
  echo "New type errors introduced. Fix them before merging, or update" >&2
  echo "tsc-error-baseline if the increase is unavoidable and deliberate." >&2
  exit 1
fi

echo "tsc ratchet OK: $COUNT / $BASELINE errors"
