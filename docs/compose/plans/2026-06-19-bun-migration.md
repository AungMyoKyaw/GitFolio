# Bun Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Bun the explicit, locked package manager for GitFolio and verify the toolchain works end-to-end.

**Architecture:** Add a `packageManager` field to `package.json`, refresh the lockfile, and update any npm-branded instructions in docs. Then run the build/test/typecheck commands through Bun to confirm compatibility.

**Tech Stack:** Bun, Electron, electron-vite, Vitest, TypeScript

---

### Task 1: Pin Bun as package manager

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `packageManager` field**

Add the field right after `version` in `package.json`:

```json
{
  "name": "gitfolio",
  "version": "1.0.0",
  "packageManager": "bun@1.4.0",
  ...
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: pin bun@1.4.0 as packageManager"
```

### Task 2: Refresh lockfile and install dependencies

**Files:**
- Modify: `bun.lock`

- [ ] **Step 1: Re-install with Bun**

Run:

```bash
bun install
```

Expected: `bun.lock` updates if needed, `node_modules` is populated, no errors.

- [ ] **Step 2: Commit lockfile changes if any**

```bash
git diff --quiet bun.lock || (git add bun.lock && git commit -m "chore: refresh bun.lock")
```

### Task 3: Update documentation references

**Files:**
- Modify: `docs/compose/plans/2026-06-19-gitfolio.md`

- [ ] **Step 1: Replace npm commands with Bun equivalents**

In `docs/compose/plans/2026-06-19-gitfolio.md`, replace:
- `npm install` → `bun install`
- `npm test` → `bun run test`
- `npm run typecheck` → `bun run typecheck`
- `npm run dev` → `bun run dev`

Do not change occurrences inside example test fixtures (e.g., `package-lock.json` diff examples).

- [ ] **Step 2: Commit**

```bash
git add docs/compose/plans/2026-06-19-gitfolio.md
git commit -m "docs: update plan commands to use bun"
```

### Task 4: Verify toolchain under Bun

**Files:**
- None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
bun run typecheck
```

Expected: both `tsc --noEmit` calls exit 0.

- [ ] **Step 2: Run tests**

```bash
bun run test
```

Expected: Vitest exits 0.

- [ ] **Step 3: Run production build**

```bash
bun run build
```

Expected: electron-vite builds main, preload, and renderer; `out/` directory is updated.

- [ ] **Step 4: (Optional) Run package build**

```bash
bun run package
```

Expected: electron-builder produces a distributable in `dist/`; may be skipped if it exceeds time budget.

- [ ] **Step 5: Record results**

Note the pass/fail status of each verification step in the session. If any step fails, stop and diagnose before claiming completion.
