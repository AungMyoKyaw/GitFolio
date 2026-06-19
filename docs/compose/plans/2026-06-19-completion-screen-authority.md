# Completion Screen Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the completion screen visually dominate the main content area while keeping the sidebar visible, and sync the previously executed plan checklist with the actual completed work.

**Architecture:** Keep the existing two-column shell, but give the `done` phase its own wide-format panel and spacing rules so the success state outweighs the sidebar. Update renderer tests first, then implement the dedicated done-phase layout and finally mark the earlier implementation plan checklist as completed.

**Tech Stack:** Electron, React, TypeScript, Vitest

---

### Task 1: Lock the new completion-screen expectations with tests

**Files:**
- Modify: `tests/renderer/layout.test.ts`

- [ ] **Step 1: Write the failing completion-layout assertions**

```ts
test('gives the done phase a dedicated wide layout inside the main content area', () => {
  expect(app).toContain('className="phase-screen phase-screen-done"')
  expect(app).toContain('className="done-lede"')
  expect(app).toContain('className="done-summary"')
  expect(css).toMatch(/\.phase-screen-done\s*\{[^}]*align-items:\s*stretch;/s)
  expect(css).toMatch(/\.done-card\s*\{[^}]*width:\s*min\(980px, 100%\);/s)
})
```

- [ ] **Step 2: Run the renderer test file and confirm failure**

Run: `bun test tests/renderer/layout.test.ts`
Expected: FAIL because the dedicated done layout classes and wider sizing do not exist yet.

### Task 2: Give the completion state more authority

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/index.css`
- Test: `tests/renderer/layout.test.ts`

- [ ] **Step 1: Replace the compact done header with a more structured success narrative**

```tsx
<section className="phase-screen phase-screen-done">
  <div className="done-card surface-card">
    <p className="done-lede">Export complete</p>
    <h2>Markdown portfolio generated</h2>
    <p className="done-summary">
      Processed {exportedRepos.toLocaleString()} repositories across {exportedAuthors.toLocaleString()} authors and assembled {exportedCommits.toLocaleString()} commits into one markdown portfolio.
    </p>
  </div>
</section>
```

- [ ] **Step 2: Widen the done card, increase spacing, and left-anchor it within the main panel**

```css
.phase-screen-done {
  align-items: stretch;
  justify-content: center;
}

.done-card {
  width: min(980px, 100%);
  margin: auto 0;
  padding: 40px;
}
```

- [ ] **Step 3: Make the stats read like completion facts instead of dashboard widgets**

```tsx
<StatCard label="Repositories" value={exportedRepos.toLocaleString()} />
<StatCard label="Authors" value={exportedAuthors.toLocaleString()} accent />
<StatCard label="Commits" value={exportedCommits.toLocaleString()} />
<StatCard label="Time" value={exportDuration !== null ? formatDuration(exportDuration) : '—'} />
```

```css
.stat-card strong {
  font-size: 26px;
}
```

- [ ] **Step 4: Run the renderer test file and confirm it passes**

Run: `bun test tests/renderer/layout.test.ts`
Expected: PASS

### Task 3: Sync the earlier plan checklist and re-verify the project

**Files:**
- Modify: `docs/compose/plans/2026-06-19-audit-followups.md`
- Test: `tests/renderer/layout.test.ts`

- [ ] **Step 1: Mark the completed checklist items as done in the prior plan**

```md
- [x] **Step 1: Write the failing renderer assertions**
...
- [x] **Step 3: Run the full project verification command**
```

- [ ] **Step 2: Run the full project verification command**

Run: `bun test && bunx tsc --noEmit -p tsconfig.json`
Expected: PASS with the redesigned done screen and checked plan checklist.
