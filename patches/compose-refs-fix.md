# Radix UI compose-refs Patch

## Problem
`@radix-ui/react-compose-refs@1.1.2` calls `setState`-based function refs synchronously during React's commit phase, causing "Maximum update depth exceeded" infinite loops on pages with multiple Radix components (Tabs, Tooltip, ScrollArea, Dialog).

## Fix
In `node_modules/@radix-ui/react-compose-refs/dist/index.mjs`, the `setRef` function wraps function ref calls in `queueMicrotask()` to defer them out of the commit phase.

## How to re-apply after npm install
Run this after any `npm install` or `pnpm install`:

```bash
# Patch both copies of compose-refs
for f in \
  node_modules/@radix-ui/react-compose-refs/dist/index.mjs \
  node_modules/.pnpm/@radix-ui+react-compose-refs@1.1.2_*/node_modules/@radix-ui/react-compose-refs/dist/index.mjs; do
  if [ -f "$f" ]; then
    cat > "$f" << 'PATCH'
import * as React from "react";
function setRef(ref, value) {
  if (typeof ref === "function") {
    queueMicrotask(() => ref(value));
    return undefined;
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => setRef(ref, node));
  };
}
function useComposedRefs(...refs) {
  return React.useCallback(composeRefs(...refs), refs);
}
export { composeRefs, useComposedRefs };
PATCH
    echo "Patched: $f"
  fi
done
```

## Long-term fix
Upgrade `@radix-ui/react-compose-refs` when a version >1.1.2 is released that fixes the React 18.3+ commit phase compatibility issue.
