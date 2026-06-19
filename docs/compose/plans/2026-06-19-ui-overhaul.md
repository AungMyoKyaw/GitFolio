# GitFolio UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the GitFolio renderer UI so it matches `DESIGN.md` with a denser, phase-based desktop workflow and stronger visual hierarchy.

**Architecture:** Keep the existing single-file renderer flow and phase state, but replace the inline presentational structure with deliberate layout sections and class-based styling. Concentrate the overhaul in `src/renderer/src/App.tsx` and `src/renderer/src/index.css` so behavior stays stable while the UI becomes more cohesive.

**Tech Stack:** Electron, React 18, TypeScript, CSS

---

## File Structure

- `DESIGN.md`: Source of truth for colors, spacing, workflow, and component behavior.
- `src/renderer/src/App.tsx`: Phase layouts, copy, metrics, actions, and semantic structure.
- `src/renderer/src/index.css`: Design tokens, surfaces, buttons, inputs, tables, progress, and responsive behavior.

---

### Task 1: Restructure Renderer Layout

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Update the app shell and phase components**

Replace the current sparse inline wrappers with a fixed header, reusable panel layout, phase labels, and richer supporting copy while keeping the same `Phase` state machine and Electron API calls.

- [ ] **Step 2: Improve phase-specific UX**

Give folder picking a clearer onboarding panel, scanning/exporting a centered progress card with counts, author selection a denser toolbar plus summary metadata, and completion a success panel that highlights the export path.

- [ ] **Step 3: Preserve existing behavior**

Keep folder selection, repo scanning, recent author restoration, export, and reset semantics unchanged so the overhaul is visual/structural rather than a workflow rewrite.

---

### Task 2: Apply DESIGN.md Styling System

**Files:**
- Modify: `src/renderer/src/index.css`

- [ ] **Step 1: Promote the design tokens into CSS variables**

Define the documented background, surface, raised surface, border, text, accent, spacing, radius, and typography values in `:root`.

- [ ] **Step 2: Replace ad hoc styles with reusable classes**

Style the shell, panels, buttons, inputs, progress bar, error banner, and author table to match the terminal-inspired dark theme and green-accent rules in `DESIGN.md`.

- [ ] **Step 3: Add focused responsive behavior**

Make the main layout usable on smaller widths by stacking action rows and letting dense panels scroll without breaking the desktop-first presentation.

---

### Task 3: Verify the Overhaul

**Files:**
- Verify: `src/renderer/src/App.tsx`
- Verify: `src/renderer/src/index.css`

- [ ] **Step 1: Run type checking**

Run: `bun run typecheck`
Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Run tests**

Run: `bun run test`
Expected: PASS with existing test suite green.
