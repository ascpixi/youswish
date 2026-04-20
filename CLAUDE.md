# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # compile with tsup → dist/index.js
npm run dev -- <args>  # run from source via tsx (e.g. npm run dev -- exists <url>)
npm install -g .    # install locally for end-to-end testing
```

There are no tests or a linter configured.

## Architecture

`src/index.ts` is the CLI entry point (registered as the `youswish` bin). It wires up subcommands via `commander` and delegates to handler functions in `src/commands/`.

**Data flow for `exists`:**
1. `config.ts` — loads `~/.youswish.json`, prompting interactively for any missing fields and saving them back
2. `url.ts` — `getSearchVariants()` normalizes the input URL (strips protocol, `www.`, query, hash) and generates parent path variants down to depth 2 (e.g. `github.com/user/repo/releases` → `[…/releases, …/repo]`); the full URL is always included even if it has no path
3. `airtable.ts` — `searchProjects()` sends a single `filterByFormula` request to Airtable so only candidate records are returned (never a full table scan); the formula uses `FIND("variant/", …)` for child-path matches and `RIGHT(…) = "variant"` for terminal matches to enforce path boundaries
4. `commands/exists.ts` — runs a client-side `pathMatchKind()` check on returned records to drop FIND false positives (e.g. `repo` matching `repo2`), then classifies each as `exact`, `ancestor`, or `descendant`

**Airtable constants** (base ID, table ID, view ID) live in `src/airtable.ts`. The target table is the Unified YSWS Projects DB (`app3A5kJwYqxMLOgh / tblzWWGUYHVH7Zyqf`).

**Adding a new subcommand:** create `src/commands/<name>.ts` exporting an async handler, register it in `src/index.ts` via `program.command(...)`.
