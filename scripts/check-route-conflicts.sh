#!/usr/bin/env bash
# ------------------------------------------------------------------
# Detect duplicate Next.js App Router dynamic segments.
#
# Next.js cannot have two different dynamic slugs (e.g. [id] and
# [clientId]) as SIBLINGS under the same parent directory. Nested
# segments like [type]/[id] are fine.
#
# This script finds every such sibling conflict and exits non-zero
# so CI / pre-commit blocks the offending change.
# ------------------------------------------------------------------
set -euo pipefail

CONFLICTS=0

# For each directory, check if it has more than one direct-child
# dynamic segment (e.g. both [id] and [clientId])
find app -type d | while IFS= read -r parent; do
  # List direct-child dynamic-segment directories
  slugs=()
  while IFS= read -r child; do
    [[ -z "$child" ]] && continue
    slugs+=("$(basename "$child")")
  done < <(find "$parent" -maxdepth 1 -mindepth 1 -type d -name '\[*\]' 2>/dev/null)

  if [[ ${#slugs[@]} -gt 1 ]]; then
    echo "CONFLICT: $parent/ has sibling dynamic segments: ${slugs[*]}"
    CONFLICTS=$((CONFLICTS + 1))
  fi
done

if [[ $CONFLICTS -gt 0 ]]; then
  echo ""
  echo "ERROR: Found dynamic-route-segment conflict(s)."
  echo "Next.js App Router cannot have two different dynamic segments"
  echo "at the same directory level (e.g. [id] vs [clientId])."
  echo "Remove the duplicate before committing."
  exit 1
fi

echo "No dynamic route conflicts found."
exit 0
