# GitFolio 10/10 UX Overhaul — Design Spec

> **Status:** Approved  
> **Date:** 2026-06-19  
> **Scope:** Full-stack — renderer, main process, IPC, preload, types

---

## [S1] Problem

A UX audit scored GitFolio 7.4/10 and identified seven specific areas below 7:

| Area | Score | Root Cause |
|---|---|---|
| Scan experience | 6.5 | No ETA, no current repo, no authors-found counter |
| Desktop efficiency | 6.0 | Full-screen progress replaces content; no persistent context |
| Export experience | 5.5 | No visibility into what is being exported |
| Completion screen | 4.0 | One button, no stats, no file actions |

Cross-cutting issue: the `header-phase-card` duplicates information already shown in the stepper and consumes premium screen space with no unique value.

---

## [S2] Solution Overview

Replace the current single-column layout (header → stepper → full-screen phase content) with:

1. A compact header row that combines the brand and stepper
2. A **persistent left context panel** showing live workspace stats across all phases
3. A **footer status bar** that carries scan/export progress detail without hijacking the main area
4. Phase-specific main content that is no longer crowded by duplicate chrome

Backend additions are minimal: one new field on `AuthorInfo`, two new IPC shell handlers.

---

## [S3] Shell Structure

**New layout (CSS grid, column-based):**

```
┌─────────────────────────────────────────────────────────┐
│ app-header: brand (left) + stepper steps (right/center) │
├──────────────┬──────────────────────────────────────────┤
│ context-panel│ app-main (phase content)                 │
│   240px      │   flex-1                                 │
│              │                                          │
├──────────────┴──────────────────────────────────────────┤
│ app-footer (visible only during scanning / exporting)   │
└─────────────────────────────────────────────────────────┘
```

**Removed:** `.header-phase-card` and its CSS.  
**Moved:** `.phase-strip` becomes part of `.app-header` as a flex row.  
**Added:** `.context-panel`, `.app-footer`.

The app body uses `display: grid` with `grid-template-columns: 240px 1fr` and `grid-template-rows: 1fr auto`.

---

## [S4] Stepper Visual States

Three distinct states replacing the current near-identical appearance:

| State | Number | Circle | Text |
|---|---|---|---|
| `complete` | `✓` symbol | Amber-filled circle | Muted |
| `active` | `0N` number | Amber border, tint bg | Full brightness |
| `upcoming` | `0N` number | Muted border | Muted |

Implementation: CSS classes `.phase-item-complete`, `.phase-item-active`, `.phase-item-upcoming` (rename from `upcoming` for clarity). The `✓` is rendered as a Unicode character or SVG inline in the step number slot.

---

## [S5] Context Panel

Always visible. Positioned left of the main content area.

**Content:**

```
WORKSPACE
<truncated folder path>        ← full path in title tooltip

──────────────────

REPOSITORIES        445
AUTHORS             809
SELECTED             13
COMMITS          12,670
```

**State mapping:**

| App phase | Panel content |
|---|---|
| `pick-folder` | All stats show `—` |
| `scanning` | Repos updates from progress; Authors updates from progress |
| `pick-authors` | All stats populated |
| `exporting` | Stats frozen from pick-authors |
| `done` | Stats frozen |

During `pick-authors`, the "Selected" and "Commits" rows use amber text when their value is > 0.

**Export button:** In the `pick-authors` phase only, a full-width `btn-primary` button appears at the bottom of the context panel: `Export Portfolio (13)`. Disabled when `selectedCount === 0`. This replaces the small export button currently in the table command bar.

---

## [S6] Folder Pick Screen

Main content (right of context panel):

1. **Hero card** — unchanged: eyebrow + heading + description + "Choose Folder" button
2. **Recent Workspaces section** (below hero card, conditional on having history):
   - Heading: "Recent Workspaces"
   - Up to 5 rows from `getRecentSelections()`, sorted by `timestamp` descending
   - Each row: workspace name (basename of path), full path in muted text, last-used relative date, click-to-reopen
   - Re-open logic: refactor `handlePickFolder` to accept an optional `folderPath?: string` argument. When provided, skip the `window.api.openFolder()` dialog and proceed directly to scanning with the given path. The rest of the scan flow is identical.
3. **No history fallback** (replaces recent workspaces when list is empty):
   - "What GitFolio does" 4-step checklist: Find repositories → Extract authors → Merge identities → Generate portfolio

---

## [S7] Scan & Export Screens

### Main area (minimal)

A centered placeholder card:
- Eyebrow: phase label (`Repository discovery` or `Markdown assembly`)
- Heading: phase title (`Scanning for git histories` or `Exporting contribution portfolio`)
- A subtle pulsing dot or spinner (CSS animation, no external dependency)

No progress stats in the main area — they live in the footer.

### Footer status bar

Visible during `scanning` and `exporting` phases. Fixed to the bottom of the app shell.

**Layout (single row, space-between):**

```
[Phase label]  [████████░░░░░░░  58%]  [mailing-list]  [258/445 · 2m 31s · ETA 1m 12s]
```

**Fields:**

| Field | Source |
|---|---|
| Phase label | Hardcoded per phase |
| Progress bar | `progress.current / progress.total` |
| Percentage | Computed |
| Current item | `progress.message` |
| Count | `${current} / ${total}` |
| Elapsed | Frontend timer: `Date.now() - scanStartTime.current` |
| ETA | `(elapsed / current) * (total - current)`, hidden until `current > 5` |

**Timer implementation:** `scanStartTime` stored in a `useRef`, reset when entering `scanning` or `exporting`. A `setInterval` (500ms) increments a `elapsed` state. Cleared on phase exit.

---

## [S8] Author Selection Screen

Changes from current:

1. **Export button** relocated to context panel (see [S5]) — removed from `.table-action-row`
2. **"Repos" column** added to the author table, sourced from `author.repoCount` (new field — see [S10])
3. **Back button** remains in the table command bar (secondary action)
4. Column order: `☐ | Name | Email | Repos | Commits`

---

## [S9] Completion Screen

Full-width success card in the main area.

**Layout:**

```
✓  Export Complete

┌──────────┬──────────┬──────────┬──────────┐
│   445    │    13    │  12,670  │  4m 28s  │
│  repos   │ authors  │ commits  │   time   │
└──────────┴──────────┴──────────┴──────────┘

Output path
/Users/developer/projects/portfolio.md

[ Open File ]   [ Open Folder ]   [ Copy Path ]   [ Start Over ]
```

**Stats tracking in App state:**

- `exportStartTime: number | null` — set when entering `exporting` phase
- `exportDuration: number | null` — computed on transition to `done` as `Date.now() - exportStartTime`
- `exportedRepos: number` — `repos.length` at export time
- `exportedAuthors: number` — `selectedAuthors.length` at export time
- `exportedCommits: number` — sum of `commitCount` for selected authors

**Action buttons:**

| Button | Action |
|---|---|
| Open File | `window.api.openFile(outputPath)` — new IPC |
| Open Folder | `window.api.showInFolder(outputPath)` — new IPC |
| Copy Path | `navigator.clipboard.writeText(outputPath)` — no IPC needed |
| Start Over | existing `reset()` |

---

## [S10] Backend Changes

### `src/shared/types.ts`

Add `repoCount: number` to `AuthorInfo`:

```ts
export interface AuthorInfo {
  name: string
  email: string
  commitCount: number
  repoCount: number   // ← new
}
```

### `src/main/git/authors.ts`

When building the author map, also track a `Set<string>` of repo paths per author key. After aggregation, set `repoCount = repoPathSet.size`.

### `src/main/ipc.ts`

Two new handlers using Electron's `shell`:

```ts
ipcMain.handle('open-file', (_, path: string) => shell.openPath(path))
ipcMain.handle('show-in-folder', (_, path: string) => shell.showItemInFolder(path))
```

### `src/preload/index.ts`

Expose `openFile` and `showInFolder` via `contextBridge`, and ensure `getRecentSelections` / `saveRecentSelection` are also exposed (they are called from the renderer but currently absent from the `.d.ts`).

### `src/preload/index.d.ts`

Add to the `api` interface:
```ts
getRecentSelections: () => Promise<RecentSelection[]>
saveRecentSelection: (selection: RecentSelection) => Promise<void>
openFile: (path: string) => Promise<void>
showInFolder: (path: string) => Promise<void>
```

---

## [S11] Files Changed

| File | Type of change |
|---|---|
| `src/shared/types.ts` | Add `repoCount` to `AuthorInfo` |
| `src/main/git/authors.ts` | Compute and return `repoCount` per author |
| `src/main/ipc.ts` | Add `open-file`, `show-in-folder` IPC handlers |
| `src/preload/index.ts` | Expose new handlers + verify existing ones |
| `src/preload/index.d.ts` | Fix all missing type declarations |
| `src/renderer/src/App.tsx` | Full overhaul per S3–S9 |
| `src/renderer/src/index.css` | New shell grid, context panel, footer status bar |

No new files. No test file changes required (existing tests cover the backend logic; new IPC handlers are pass-through shell calls with no testable logic).

---

## [S12] Out of Scope

- Keyboard shortcuts (⌘O, ⌘F, etc.) — valid audit item but separate feature request
- Context menu on author rows — separate feature request
- Dark contrast accessibility pass — design token values are already set; this would need a separate accessibility audit with contrast measurements
- Persistent sidebar layout on narrow windows — responsive breakpoints will collapse the context panel below content on `< 900px`
