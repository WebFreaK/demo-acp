---
name: dual-file-sync
description: "Enforce dual-file synchronization for Agent Commerce Matério MVP. Use when: editing search logic, system prompt, tools, cross-sell, ranking, templates, analyzeProject, executeTool, findComplements, getFinancingPlan, COMPLEMENT_MAP, TOOLS array, VALID_IDS, or any shared function in the demo-materio-mvp project. Prevents the common bug where changes are applied to only one file (api/chat.js OR server.js) and appear broken locally or in production."
---

# Dual-File Sync — Matério MVP

## Architecture

The `demo-materio-mvp` project has **two independent copies** of all core logic:

| File | Purpose | Runtime |
|------|---------|---------|
| `server.js` | Local dev server (`node server.js` on port 3000) | Local testing, browser UI |
| `api/chat.js` | Vercel serverless function | Production deployment |

Both files are standalone — `server.js` does NOT import from `api/chat.js`.

## Shared Functions (must stay in sync)

| Function | server.js | api/chat.js |
|----------|-----------|-------------|
| `searchCatalogInternal()` | ~L491 | ~L332 |
| `analyzeProject()` | ~L556 | ~L397 |
| `executeTool()` | ~L934 | ~L830 |
| `findComplements()` | ~L1060 | ~L758 |
| `getFinancingPlan()` | ~L1100 | ~L722 |

## Shared Data Structures

| Structure | server.js | api/chat.js |
|-----------|-----------|-------------|
| `VALID_IDS` | ~L100 | ~L19 |
| System prompt | ~L104 | ~L18 |
| `TOOLS` array | ~L729 | ~L571 |
| `COMPLEMENT_MAP` | ~L1039 | ~L737 |

## Procedure

1. **Before editing**: Identify which function/structure you're changing
2. **Find both locations**: Use the table above to locate the code in both files
3. **Apply the change to BOTH files**: Use `multi_replace_string_in_file` to edit both at once when possible
4. **Restart the server**: `pkill -f "node server" 2>/dev/null; sleep 1; cd website/demo-materio-mvp && node server.js` (background)
5. **Test locally**: The browser UI hits `server.js`, NOT `api/chat.js`

## Common Pitfall

Editing only `api/chat.js` and testing locally will show **no change** because the browser hits `server.js`. This is the #1 source of "my fix doesn't work" during this project.
