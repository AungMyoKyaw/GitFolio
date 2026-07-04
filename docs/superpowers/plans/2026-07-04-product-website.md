# GitFolio Product Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static product website for GitFolio that presents the app as a local-first proof-of-work portfolio exporter.

**Architecture:** The root `index.html` becomes a standalone product website and links to a new `website.css`. The Electron app remains isolated because it uses `src/renderer/index.html`. Tests validate the website structure, copy, screenshots, local-first claims, and responsive styling by reading the static files.

**Tech Stack:** Static HTML, CSS, existing screenshots under `docs/screenshots/`, Bun, Vitest.

---

## File Structure

- Modify: `index.html` - standalone marketing page with semantic sections and valid links.
- Create: `website.css` - responsive product website styling using the GitFolio palette.
- Create: `tests/website/landing.test.ts` - static contract tests for content and CSS requirements.
- Create: `docs/superpowers/plans/2026-07-04-product-website.md` - this implementation plan.

### Task 1: Website Contract Tests

**Files:**

- Create: `tests/website/landing.test.ts`

- [x] **Step 1: Write failing tests**

Add tests that assert the website links `website.css`, presents the approved positioning, references real screenshots, includes workflow/output/trust/install sections, and defines mobile responsive CSS.

- [x] **Step 2: Run tests to verify they fail**

Run: `bun test tests/website/landing.test.ts`

Expected: FAIL because `website.css` and the new static website content do not exist yet.

### Task 2: Static Product Website

**Files:**

- Modify: `index.html`
- Create: `website.css`

- [x] **Step 1: Implement the root static page**

Replace the app bootstrap page with semantic landing-page HTML that includes hero, problem, workflow, output, trust, use cases, and install sections.

- [x] **Step 2: Implement responsive website CSS**

Create `website.css` using the existing warm dark GitFolio identity, real screenshot presentation, compact layout, mobile breakpoints, and accessible focus states.

- [x] **Step 3: Run the website tests**

Run: `bun test tests/website/landing.test.ts`

Expected: PASS.

### Task 3: Full Verification

**Files:**

- Read: `package.json`
- Read: `index.html`
- Read: `website.css`

- [x] **Step 1: Run full test suite**

Run: `bun test`

Expected: PASS.

- [x] **Step 2: Run typecheck**

Run: `bun run typecheck`

Expected: PASS.

- [x] **Step 3: Run production build**

Run: `bun run build`

Expected: PASS; the Electron build still uses `src/renderer/index.html`.

- [x] **Step 4: Review git diff**

Run: `git diff --stat` and `git diff --check`

Expected: Website, tests, and plan files only; no whitespace errors.
