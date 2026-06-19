# GitFolio 10/10 UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul GitFolio's renderer and backend to address all items from the 7.4/10 UX audit and reach a 10/10 score.

**Architecture:** Backend: add `repoCount` to `AuthorInfo` and two new Electron shell IPC handlers. Renderer: replace the single-column layout with a persistent left context panel + footer status bar, enrich every phase with live data, and replace the completion screen's single button with a full stats + 4-action panel.

**Spec:** `docs/compose/specs/2026-06-19-10-out-of-10-overhaul-design.md`

**Tech Stack:** Electron, React 18, TypeScript, CSS (no new dependencies)

---

## File Structure

| File | Role |
|---|---|
| `src/shared/types.ts` | Add `repoCount: number` to `AuthorInfo` |
| `src/main/git/authors.ts` | Track per-author repo set; compute `repoCount` |
| `src/main/ipc.ts` | Add `shell:openFile`, `shell:showInFolder` IPC handlers |
| `src/preload/index.ts` | Expose new shell handlers |
| `src/preload/index.d.ts` | Fix all missing type declarations |
| `src/renderer/src/index.css` | New shell grid, context panel, footer bar, stepper states, folder pick, done screen |
| `src/renderer/src/App.tsx` | Shell restructure, all new components, updated state |

---

### Task 1: Add `repoCount` to `AuthorInfo` type

**Covers:** [S10]

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add the field**

Replace the `AuthorInfo` interface:

```ts
export interface AuthorInfo {
  name: string
  email: string
  commitCount: number
  repoCount: number
}
```

- [ ] **Step 2: Run typecheck to see what breaks**

```bash
bun run typecheck
```

Expected: TypeScript errors in `authors.ts` and `authors.test.ts` (those are fixed in later tasks). Zero unexpected errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add repoCount to AuthorInfo"
```

---

### Task 2: Compute `repoCount` in `getAuthors`

**Covers:** [S10]

**Files:**
- Modify: `src/main/git/authors.ts`
- Modify: `tests/main/git/authors.test.ts`

- [ ] **Step 1: Update the test file first**

Replace the full contents of `tests/main/git/authors.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as childProcess from 'child_process'

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

import { getAuthors } from '@main/git/authors'

const mockExecSync = childProcess.execSync as unknown as ReturnType<typeof vi.fn>

describe('getAuthors', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('aggregates commit counts per name and email', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('Alice|alice@example.com\nAlice|alice@example.com\nBob|bob@example.com\n')
    )

    const progress: string[] = []
    const authors = await getAuthors(['/repos/a'], (event) => progress.push(event.message))

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 2, repoCount: 1 },
      { name: 'Bob', email: 'bob@example.com', commitCount: 1, repoCount: 1 }
    ])
    expect(progress).toEqual(['Scanning authors in a'])
  })

  it('keeps same-name different-email authors separate', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('Alice|alice@example.com\nAlice|alice@work.com\n')
    )

    const authors = await getAuthors(['/repos/a'], () => {})

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 1, repoCount: 1 },
      { name: 'Alice', email: 'alice@work.com', commitCount: 1, repoCount: 1 }
    ])
  })

  it('counts repoCount across multiple repos', async () => {
    mockExecSync
      .mockReturnValueOnce(Buffer.from('Alice|alice@example.com\n'))
      .mockReturnValueOnce(Buffer.from('Alice|alice@example.com\n'))

    const authors = await getAuthors(['/repos/a', '/repos/b'], () => {})

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 2, repoCount: 2 }
    ])
  })

  it('counts repoCount as 1 when author appears in only one of two repos', async () => {
    mockExecSync
      .mockReturnValueOnce(Buffer.from('Alice|alice@example.com\n'))
      .mockReturnValueOnce(Buffer.from('Bob|bob@example.com\n'))

    const authors = await getAuthors(['/repos/a', '/repos/b'], () => {})

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 1, repoCount: 1 },
      { name: 'Bob', email: 'bob@example.com', commitCount: 1, repoCount: 1 }
    ])
  })

  it('skips repos that error', async () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('bad repo')
    })

    const authors = await getAuthors(['/repos/a'], () => {})
    expect(authors).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
bun run test tests/main/git/authors.test.ts
```

Expected: FAIL — `repoCount` property missing.

- [ ] **Step 3: Update `getAuthors` to track repos per author**

Replace the full contents of `src/main/git/authors.ts`:

```ts
import { execSync } from 'child_process'
import type { AuthorInfo, ProgressEvent } from '../../shared/types'

type ProgressCallback = (event: ProgressEvent) => void

export async function getAuthors(
  repoPaths: string[],
  onProgress: ProgressCallback
): Promise<AuthorInfo[]> {
  const authorMap = new Map<string, { name: string; email: string; commitCount: number }>()
  const authorRepos = new Map<string, Set<string>>()

  for (let i = 0; i < repoPaths.length; i++) {
    const repoPath = repoPaths[i]
    onProgress({
      phase: 'authors',
      current: i + 1,
      total: repoPaths.length,
      message: `Scanning authors in ${repoPath.split('/').pop()}`
    })

    try {
      const output = execSync('git log --all --format="%an|%ae"', {
        cwd: repoPath,
        timeout: 30000,
        maxBuffer: 50 * 1024 * 1024
      }).toString()

      for (const line of output.split('\n')) {
        const trimmed = line.trim().replace(/^"|"$/g, '')
        if (!trimmed) continue
        const sep = trimmed.indexOf('|')
        if (sep === -1) continue
        const name = trimmed.slice(0, sep).trim()
        const email = trimmed.slice(sep + 1).trim()
        if (!name || !email) continue
        const key = `${name.toLowerCase()}|${email.toLowerCase()}`
        const existing = authorMap.get(key)
        if (existing) {
          existing.commitCount++
        } else {
          authorMap.set(key, { name, email, commitCount: 1 })
        }
        const repoSet = authorRepos.get(key) ?? new Set<string>()
        repoSet.add(repoPath)
        authorRepos.set(key, repoSet)
      }
    } catch {
      // skip repos that error
    }
  }

  return Array.from(authorMap.entries())
    .map(([key, author]) => ({
      ...author,
      repoCount: authorRepos.get(key)?.size ?? 0
    }))
    .sort((a, b) => b.commitCount - a.commitCount)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun run test tests/main/git/authors.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/main/git/authors.ts tests/main/git/authors.test.ts
git commit -m "feat(authors): compute repoCount per author"
```

---

### Task 3: Add shell IPC handlers and update preload

**Covers:** [S10]

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Add `shell` import and two handlers to `ipc.ts`**

Change the import line at the top of `src/main/ipc.ts`:

```ts
import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron'
```

Then add these two handlers at the end of `registerIpcHandlers`, just before the closing `}`:

```ts
  ipcMain.handle('shell:openFile', (_, path: string) => shell.openPath(path))

  ipcMain.handle('shell:showInFolder', (_, path: string) => {
    shell.showItemInFolder(path)
  })
```

- [ ] **Step 2: Expose the new handlers in `src/preload/index.ts`**

Add two entries to the `api` object in `src/preload/index.ts`, after `saveRecentSelection`:

```ts
  openFile: (path: string): Promise<void> => ipcRenderer.invoke('shell:openFile', path),
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke('shell:showInFolder', path),
```

- [ ] **Step 3: Fix `src/preload/index.d.ts`**

Replace the full contents of `src/preload/index.d.ts`:

```ts
import type { AuthorInfo, ExportOptions, ProgressEvent, RecentSelection, RepoInfo } from '../shared/types'

declare global {
  interface Window {
    api: {
      openFolder: () => Promise<string | null>
      saveFile: () => Promise<string | null>
      scanRepos: (folderPath: string) => Promise<RepoInfo[]>
      getAuthors: (repoPaths: string[]) => Promise<AuthorInfo[]>
      exportContributions: (options: ExportOptions) => Promise<void>
      onProgress: (callback: (event: ProgressEvent) => void) => () => void
      getRecentSelections: () => Promise<RecentSelection[]>
      saveRecentSelection: (selection: RecentSelection) => Promise<void>
      openFile: (path: string) => Promise<void>
      showInFolder: (path: string) => Promise<void>
    }
  }
}
```

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS — zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat(ipc): add openFile and showInFolder shell handlers"
```

---

### Task 4: CSS — Shell grid, context panel, footer status bar

**Covers:** [S3], [S5], [S7]

**Files:**
- Modify: `src/renderer/src/index.css`

This task replaces the flex-column shell with a grid-based layout and adds the context panel and footer bar styles. Apply all changes in one editing pass to `index.css`.

- [ ] **Step 1: Replace the `.app-shell` and `.app-header` rules**

Find and replace the existing `.app-shell` block:

```css
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  gap: 16px;
}
```

Replace with:

```css
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  gap: 12px;
}
```

Find and replace the existing `.app-header` block:

```css
.app-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
```

Replace with:

```css
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.brand-block {
  flex-shrink: 0;
}
```

- [ ] **Step 2: Remove `.header-phase-card` CSS**

Delete the entire block:

```css
.header-phase-card,
.surface-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.header-phase-card {
  display: flex;
  min-width: 240px;
  max-width: 320px;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
}

.header-phase-card strong {
  font-size: 16px;
}

.header-phase-card span:last-child {
  color: var(--text-muted);
  font-size: 13px;
}
```

And replace with just the `.surface-card` rule on its own:

```css
.surface-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}
```

- [ ] **Step 3: Replace `.phase-strip` so it lives inside the header**

Find and replace the existing `.phase-strip` block:

```css
.phase-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}
```

Replace with:

```css
.phase-strip {
  display: flex;
  gap: 6px;
  flex: 1;
  justify-content: flex-end;
}
```

Find and replace the existing `.phase-item` block:

```css
.phase-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  padding: 10px 12px;
}

.phase-item strong {
  font-size: 13px;
}
```

Replace with:

```css
.phase-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  padding: 7px 12px;
  white-space: nowrap;
}

.phase-item strong {
  font-size: 12px;
  font-weight: 500;
}
```

- [ ] **Step 4: Add `.phase-item-complete` style**

After the `.phase-item-active` block, add:

```css
.phase-item-complete {
  border-color: var(--border);
  background: var(--surface);
}

.phase-item-complete .phase-index {
  color: var(--accent);
}

.phase-item-complete strong {
  color: var(--text-muted);
}
```

- [ ] **Step 5: Add `.app-body`, `.app-main`, and replace `.app-main` rule**

Find and replace the existing `.app-main` block:

```css
.app-main {
  min-height: 0;
  flex: 1;
  overflow: auto;
}
```

Replace with:

```css
.app-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.app-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}
```

- [ ] **Step 6: Add context panel styles**

Add after the `.app-main` block:

```css
.context-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  padding: 16px;
  overflow: auto;
}

.context-workspace {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.context-path {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.context-path strong {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-path-full {
  color: var(--text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-empty {
  color: var(--text-muted);
  font-size: 13px;
}

.context-stats {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.context-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: var(--background);
}

.context-stat + .context-stat {
  border-top: 1px solid var(--border);
}

.context-stat-label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.context-stat-value {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.context-stat-active .context-stat-value {
  color: var(--accent);
}

.context-export-btn {
  width: 100%;
  margin-top: auto;
  padding: 10px 16px;
}
```

- [ ] **Step 7: Add footer status bar styles**

Add after the context panel styles:

```css
.app-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  padding: 10px 14px;
}

.footer-label {
  flex-shrink: 0;
  min-width: 140px;
}

.footer-progress-track {
  width: 160px;
  flex-shrink: 0;
  height: 4px;
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  overflow: hidden;
}

.footer-progress-fill {
  height: 100%;
  border-radius: var(--radius-lg);
  background: var(--accent);
  transition: width 0.2s ease;
}

.footer-item {
  flex: 1;
  font-size: 13px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.footer-meta {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/index.css
git commit -m "feat(css): shell grid, context panel, footer status bar"
```

---

### Task 5: CSS — Folder pick, operation placeholder, done screen

**Covers:** [S6], [S7], [S9]

**Files:**
- Modify: `src/renderer/src/index.css`

- [ ] **Step 1: Update hero-card and phase-screen-centered for the new layout**

Find and replace:

```css
.hero-card,
.progress-card,
.done-card {
  width: min(100%, 1040px);
  padding: 32px;
}

.hero-card {
  display: flex;
}
```

Replace with:

```css
.hero-card,
.done-card {
  padding: 32px;
}

.hero-card {
  display: flex;
}
```

Find and replace the `.phase-screen` block:

```css
.phase-screen {
  height: 100%;
}

.phase-screen-centered {
  display: flex;
  align-items: center;
  justify-content: center;
}

.phase-screen-fill {
  height: auto;
  min-height: 100%;
}
```

Replace with:

```css
.phase-screen {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 16px;
}

.phase-screen-centered {
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Add recent workspaces styles**

Add after the `.hint-block` block:

```css
.recent-workspaces,
.feature-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.recent-item:hover {
  background: var(--surface-raised);
}

.recent-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.recent-item-info strong {
  font-size: 13px;
}

.recent-item-info code {
  color: var(--text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-item-date {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.checklist {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.checklist li::before {
  content: '✓';
  color: var(--accent);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Add operation placeholder (scan/export main area) styles**

Add after the `.progress-card` block:

```css
.operation-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
  text-align: center;
  padding: 32px;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
```

- [ ] **Step 4: Update done-card and add done-specific styles**

Find and replace the `.done-card` block (it was part of the `.hero-card, .progress-card, .done-card` block which was already updated). Now add done-specific styles after the `.done-card` entry in the `.path-block` section:

Add after `.action-row-centered`:

```css
.done-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 4px;
}

.done-check {
  font-size: 32px;
  color: var(--accent);
  line-height: 1;
  margin-top: 6px;
  flex-shrink: 0;
}

.done-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.done-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
```

- [ ] **Step 5: Update responsive breakpoints**

Find and replace the responsive section:

```css
@media (max-width: 1100px) {
  .phase-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .author-layout,
  .hero-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .app-shell {
    padding: 16px;
  }

  .phase-strip,
  .stats-grid,
  .progress-stats-grid {
    grid-template-columns: 1fr;
  }

  .table-command-bar,
  .table-command-controls,
  .table-context-row,
  .action-row,
  .progress-meta-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-wrap,
  .header-phase-card {
    width: 100%;
    max-width: none;
  }

  .hero-card,
  .progress-card,
  .done-card,
  .summary-card,
  .table-card {
    padding: 20px;
  }
}
```

Replace with:

```css
@media (max-width: 1100px) {
  .author-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .app-body {
    grid-template-columns: 1fr;
  }

  .app-header {
    flex-wrap: wrap;
  }

  .phase-strip {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 720px) {
  .app-shell {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .done-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-command-bar,
  .table-command-controls,
  .table-context-row,
  .action-row,
  .app-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .search-wrap {
    width: 100%;
    max-width: none;
  }

  .hero-card,
  .done-card,
  .summary-card,
  .table-card {
    padding: 20px;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/index.css
git commit -m "feat(css): folder pick, operation placeholder, done screen styles"
```

---

### Task 6: Renderer — App state additions and shell restructure

**Covers:** [S3], [S7], [S9]

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Update imports**

The existing import line:

```tsx
import { useEffect, useState } from 'react'
```

Replace with:

```tsx
import { useEffect, useRef, useState } from 'react'
import type { AuthorInfo, ProgressEvent, RecentSelection, RepoInfo } from '../../shared/types'
```

Remove the old type import line:

```tsx
import type { AuthorInfo, ProgressEvent, RepoInfo } from '../../shared/types'
```

(The combined import above replaces both.)

- [ ] **Step 2: Add new state variables inside `App()`**

After the existing `const [error, setError] = useState('')` line, add:

```tsx
  const [recentSelections, setRecentSelections] = useState<RecentSelection[]>([])
  const [exportedRepos, setExportedRepos] = useState(0)
  const [exportedAuthors, setExportedAuthors] = useState(0)
  const [exportedCommits, setExportedCommits] = useState(0)
  const [exportDuration, setExportDuration] = useState<number | null>(null)
  const opStartTime = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
```

- [ ] **Step 3: Load recent selections on mount**

After the existing `useEffect(() => window.api.onProgress(setProgress), [])` line, add:

```tsx
  useEffect(() => {
    window.api.getRecentSelections().then(setRecentSelections)
  }, [])
```

- [ ] **Step 4: Add elapsed timer effect**

After the recent selections effect, add:

```tsx
  useEffect(() => {
    if (phase !== 'scanning' && phase !== 'exporting') {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => {
      setElapsed(opStartTime.current ? Date.now() - opStartTime.current : 0)
    }, 500)
    return () => clearInterval(interval)
  }, [phase])
```

- [ ] **Step 5: Update `handlePickFolder` to accept an optional path**

Replace the existing `handlePickFolder` function:

```tsx
  const handlePickFolder = async (overridePath?: string) => {
    const path = overridePath ?? (await window.api.openFolder())
    if (!path) return

    setError('')
    setProgress(null)
    opStartTime.current = Date.now()
    setPhase('scanning')

    try {
      const foundRepos = await window.api.scanRepos(path)
      setRepos(foundRepos)
      setFolderPath(path)

      const foundAuthors = await window.api.getAuthors(foundRepos.map((repo) => repo.path))
      setAuthors(foundAuthors)

      const recentSels = await window.api.getRecentSelections()
      setRecentSelections(recentSels)
      const match = recentSels.find((item) => item.folderPath === path)
      setSelectedKeys(new Set(match?.authorKeys ?? []))
      setPhase('pick-authors')
    } catch (e) {
      setError(String(e))
      setPhase('pick-folder')
    }
  }
```

- [ ] **Step 6: Update `handleExport` to track stats and duration**

Replace the existing `handleExport` function:

```tsx
  const handleExport = async () => {
    const savePath = await window.api.saveFile()
    if (!savePath) return

    setError('')
    setProgress(null)
    opStartTime.current = Date.now()

    const selected = authors.filter((author) => selectedKeys.has(authorKey(author)))
    setExportedRepos(repos.length)
    setExportedAuthors(selected.length)
    setExportedCommits(selected.reduce((sum, a) => sum + a.commitCount, 0))
    setPhase('exporting')

    try {
      await window.api.saveRecentSelection({
        folderPath,
        authorKeys: selected.map(authorKey),
        timestamp: Date.now()
      })

      await window.api.exportContributions({
        repoPaths: repos.map((repo) => repo.path),
        authors: selected,
        outputPath: savePath
      })

      setExportDuration(Date.now() - (opStartTime.current ?? Date.now()))
      setOutputPath(savePath)
      setPhase('done')
    } catch (e) {
      setError(String(e))
      setPhase('pick-authors')
    }
  }
```

- [ ] **Step 7: Update `reset` to clear new state**

Replace the existing `reset` function:

```tsx
  const reset = () => {
    setPhase('pick-folder')
    setFolderPath('')
    setRepos([])
    setAuthors([])
    setSelectedKeys(new Set())
    setSearch('')
    setProgress(null)
    setOutputPath('')
    setError('')
    setExportedRepos(0)
    setExportedAuthors(0)
    setExportedCommits(0)
    setExportDuration(null)
    opStartTime.current = null
  }
```

- [ ] **Step 8: Replace the top-level JSX shell**

Replace the entire `return (...)` block of `App()`:

```tsx
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="eyebrow">Desktop contribution exporter</div>
          <div className="brand-row">
            <h1>GitFolio</h1>
          </div>
        </div>
        <nav className="phase-strip" aria-label="Workflow progress">
          {phaseOrder.map((item, index) => {
            const state = getPhaseState(item, phase)
            return (
              <div key={item} className={`phase-item phase-item-${state}`}>
                <span className="phase-index">
                  {state === 'complete' ? '✓' : `0${index + 1}`}
                </span>
                <strong>{phaseMeta[item].title}</strong>
              </div>
            )
          })}
        </nav>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span className="eyebrow">Blocking error</span>
          <p>{error}</p>
        </div>
      )}

      <div className="app-body">
        <ContextPanel
          phase={phase}
          folderPath={folderPath}
          repoCount={repos.length}
          authorCount={authors.length}
          selectedCount={selectedAuthors.length}
          commitCount={selectedAuthors.reduce((sum, a) => sum + a.commitCount, 0)}
          onExport={handleExport}
        />

        <main className="app-main">
          {phase === 'pick-folder' && (
            <FolderPickPhase
              onPick={handlePickFolder}
              recentSelections={recentSelections}
              onPickRecent={(path) => handlePickFolder(path)}
            />
          )}
          {phase === 'scanning' && (
            <OperationPlaceholder
              phaseLabel="Repository discovery"
              title="Scanning for git histories"
            />
          )}
          {phase === 'pick-authors' && (
            <AuthorPickPhase
              folderPath={folderPath}
              repos={repos}
              authors={filteredAuthors}
              totalAuthors={authors.length}
              selectedAuthors={selectedAuthors}
              selectedKeys={selectedKeys}
              search={search}
              onSearchChange={setSearch}
              onToggle={toggleAuthor}
              onExport={handleExport}
              onBack={reset}
            />
          )}
          {phase === 'exporting' && (
            <OperationPlaceholder
              phaseLabel="Markdown assembly"
              title="Exporting contribution portfolio"
            />
          )}
          {phase === 'done' && (
            <DonePhase
              outputPath={outputPath}
              exportedRepos={exportedRepos}
              exportedAuthors={exportedAuthors}
              exportedCommits={exportedCommits}
              exportDuration={exportDuration}
              onReset={reset}
            />
          )}
        </main>
      </div>

      {(phase === 'scanning' || phase === 'exporting') && (
        <FooterStatusBar phase={phase} progress={progress} elapsed={elapsed} />
      )}
    </div>
  )
```

- [ ] **Step 9: Run typecheck**

```bash
bun run typecheck
```

Expected: errors referencing `ContextPanel`, `OperationPlaceholder`, `FooterStatusBar` — these components are added in later tasks. All other errors should be zero.

- [ ] **Step 10: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(renderer): app state, timer, shell restructure"
```

---

### Task 7: Renderer — ContextPanel component

**Covers:** [S5]

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add `ContextPanel` component**

Add after the `App` function's closing `}` and before `function FolderPickPhase`:

```tsx
interface ContextPanelProps {
  phase: Phase
  folderPath: string
  repoCount: number
  authorCount: number
  selectedCount: number
  commitCount: number
  onExport: () => void
}

function ContextPanel({
  phase,
  folderPath,
  repoCount,
  authorCount,
  selectedCount,
  commitCount,
  onExport
}: ContextPanelProps) {
  const hasData = phase !== 'pick-folder'
  const folderName = folderPath ? (folderPath.split('/').pop() || folderPath) : null

  return (
    <aside className="context-panel">
      <div className="context-workspace">
        <span className="eyebrow">Workspace</span>
        {folderName ? (
          <div className="context-path" title={folderPath}>
            <strong>{folderName}</strong>
            <code className="context-path-full">{folderPath}</code>
          </div>
        ) : (
          <span className="context-empty">No folder selected</span>
        )}
      </div>

      <div className="context-stats">
        <div className="context-stat">
          <span className="context-stat-label">Repositories</span>
          <strong className="context-stat-value">
            {hasData ? repoCount.toLocaleString() : '—'}
          </strong>
        </div>
        <div className="context-stat">
          <span className="context-stat-label">Authors</span>
          <strong className="context-stat-value">
            {hasData ? authorCount.toLocaleString() : '—'}
          </strong>
        </div>
        <div className={`context-stat${selectedCount > 0 ? ' context-stat-active' : ''}`}>
          <span className="context-stat-label">Selected</span>
          <strong className="context-stat-value">
            {hasData ? selectedCount.toLocaleString() : '—'}
          </strong>
        </div>
        <div className={`context-stat${selectedCount > 0 ? ' context-stat-active' : ''}`}>
          <span className="context-stat-label">Commits</span>
          <strong className="context-stat-value">
            {hasData ? commitCount.toLocaleString() : '—'}
          </strong>
        </div>
      </div>

      {phase === 'pick-authors' && (
        <button
          className="btn-primary context-export-btn"
          onClick={onExport}
          disabled={selectedCount === 0}
        >
          Export Portfolio {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: `ContextPanel` errors resolve. Remaining errors: `OperationPlaceholder`, `FooterStatusBar`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(renderer): add ContextPanel component"
```

---

### Task 8: Renderer — FolderPickPhase with recent workspaces

**Covers:** [S6]

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Replace `FolderPickPhase`**

Find and replace the existing `FolderPickPhase` function:

```tsx
function FolderPickPhase({ onPick }: { onPick: () => void }) {
  return (
    <section className="phase-screen phase-screen-centered">
      <div className="hero-card surface-card">
        <div className="hero-copy">
          <span className="eyebrow">Phase 01</span>
          <h2>Point GitFolio at your repository workspace</h2>
          <p>
            Choose a parent folder and GitFolio will recursively detect every `.git` directory,
            merge author identities, and set up the export workflow.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-large" onClick={onPick}>
              Choose Folder
            </button>
            <div className="hint-block">
              <strong>Expected flow</strong>
              <span>{'Pick folder -> scan repos -> select authors -> export markdown'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

Replace with:

```tsx
function FolderPickPhase({
  onPick,
  recentSelections,
  onPickRecent
}: {
  onPick: () => void
  recentSelections: RecentSelection[]
  onPickRecent: (path: string) => void
}) {
  const sorted = [...recentSelections].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

  return (
    <section className="phase-screen">
      <div className="hero-card surface-card">
        <div className="hero-copy">
          <span className="eyebrow">Phase 01</span>
          <h2>Point GitFolio at your repository workspace</h2>
          <p>
            Choose a parent folder and GitFolio will recursively detect every `.git` directory,
            merge author identities, and set up the export workflow.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-large" onClick={onPick}>
              Choose Folder
            </button>
          </div>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="recent-workspaces surface-card">
          <span className="eyebrow">Recent Workspaces</span>
          <ul className="recent-list">
            {sorted.map((sel) => {
              const name = sel.folderPath.split('/').pop() || sel.folderPath
              const date = new Date(sel.timestamp).toLocaleDateString()
              return (
                <li
                  key={sel.folderPath}
                  className="recent-item"
                  onClick={() => onPickRecent(sel.folderPath)}
                >
                  <div className="recent-item-info">
                    <strong>{name}</strong>
                    <code>{sel.folderPath}</code>
                  </div>
                  <span className="recent-item-date">{date}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="feature-list surface-card">
          <span className="eyebrow">What GitFolio does</span>
          <ul className="checklist">
            <li>Find all repositories in a workspace folder</li>
            <li>Extract and merge author identities across repos</li>
            <li>Let you select which authors to include</li>
            <li>Generate a single consolidated markdown portfolio</li>
          </ul>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: `FolderPickPhase` errors resolve. Remaining: `OperationPlaceholder`, `FooterStatusBar`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(renderer): FolderPickPhase with recent workspaces"
```

---

### Task 9: Renderer — OperationPlaceholder and FooterStatusBar

**Covers:** [S7]

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add `OperationPlaceholder` component**

Add after `FolderPickPhase` and before `ProgressPhase` (which will be deleted in step 2):

```tsx
function OperationPlaceholder({
  phaseLabel,
  title
}: {
  phaseLabel: string
  title: string
}) {
  return (
    <div className="operation-placeholder">
      <div className="pulse-dot" />
      <div>
        <span className="eyebrow">{phaseLabel}</span>
        <h2>{title}</h2>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete `ProgressPhase`**

Find and delete the entire `ProgressPhase` function (it is no longer used — `OperationPlaceholder` replaces it in the shell):

```tsx
function ProgressPhase({
  progress,
  phaseLabel,
  title,
  detail
}: {
  progress: ProgressEvent | null
  phaseLabel: string
  title: string
  detail: string
}) {
  const current = progress?.current ?? 0
  const total = progress?.total ?? 0
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <section className="phase-screen phase-screen-centered">
      <div className="progress-card surface-card">
        <span className="eyebrow">{phaseLabel}</span>
        <h2>{title}</h2>
        <p>{detail}</p>

        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="progress-meta-row">
          <strong>{progress?.message ?? 'Working...'}</strong>
          <span>{pct}%</span>
        </div>

        <div className="progress-stats-grid">
          <StatCard label="Processed" value={String(current)} />
          <StatCard label="Total" value={String(total)} />
          <StatCard label="Phase" value={progress?.phase ?? 'pending'} />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Add `FooterStatusBar` component**

Add after `OperationPlaceholder` and before `AuthorPickPhase`:

```tsx
function FooterStatusBar({
  phase,
  progress,
  elapsed
}: {
  phase: Phase
  progress: ProgressEvent | null
  elapsed: number
}) {
  const current = progress?.current ?? 0
  const total = progress?.total ?? 0
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  const elapsedSec = Math.floor(elapsed / 1000)
  const elapsedStr =
    elapsedSec >= 60
      ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
      : `${elapsedSec}s`

  const etaSec =
    current > 5 && elapsed > 0
      ? Math.round(((elapsed / current) * (total - current)) / 1000)
      : null
  const etaStr =
    etaSec !== null
      ? etaSec >= 60
        ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s`
        : `${etaSec}s`
      : null

  const label = phase === 'scanning' ? 'Scanning repositories' : 'Exporting portfolio'

  return (
    <footer className="app-footer">
      <span className="footer-label eyebrow">{label}</span>
      <div className="footer-progress-track">
        <div className="footer-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="footer-item">{progress?.message ?? '—'}</span>
      <span className="footer-meta">
        {current > 0 && `${current.toLocaleString()} / ${total.toLocaleString()}`}
        {current > 0 && ` · ${pct}%`}
        {elapsedSec > 0 && ` · ${elapsedStr}`}
        {etaStr && ` · ETA ${etaStr}`}
      </span>
    </footer>
  )
}
```

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS — all component errors resolved.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(renderer): OperationPlaceholder and FooterStatusBar"
```

---

### Task 10: Renderer — AuthorPickPhase updates (repos column, export button)

**Covers:** [S8]

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Remove `onExport` from `AuthorPickPhaseProps` and the export button from the command bar**

Find the `AuthorPickPhaseProps` interface:

```tsx
interface AuthorPickPhaseProps {
  folderPath: string
  repos: RepoInfo[]
  authors: AuthorInfo[]
  totalAuthors: number
  selectedAuthors: AuthorInfo[]
  selectedKeys: Set<string>
  search: string
  onSearchChange: (value: string) => void
  onToggle: (key: string) => void
  onExport: () => void
  onBack: () => void
}
```

Replace with:

```tsx
interface AuthorPickPhaseProps {
  folderPath: string
  repos: RepoInfo[]
  authors: AuthorInfo[]
  totalAuthors: number
  selectedAuthors: AuthorInfo[]
  selectedKeys: Set<string>
  search: string
  onSearchChange: (value: string) => void
  onToggle: (key: string) => void
  onBack: () => void
}
```

- [ ] **Step 2: Update `AuthorPickPhase` function signature and remove the export button**

Find the function signature:

```tsx
function AuthorPickPhase({
  folderPath,
  repos,
  authors,
  totalAuthors,
  selectedAuthors,
  selectedKeys,
  search,
  onSearchChange,
  onToggle,
  onExport,
  onBack
}: AuthorPickPhaseProps) {
```

Replace with:

```tsx
function AuthorPickPhase({
  folderPath,
  repos,
  authors,
  totalAuthors,
  selectedAuthors,
  selectedKeys,
  search,
  onSearchChange,
  onToggle,
  onBack
}: AuthorPickPhaseProps) {
```

Find and remove the export button from the `.action-row.table-action-row`:

```tsx
              <div className="action-row table-action-row">
                <button className="btn-secondary" onClick={onBack}>
                  Back
                </button>
                <button className="btn-primary" onClick={onExport} disabled={selectedCount === 0}>
                  Export {selectedCount > 0 ? `(${selectedCount})` : ''}
                </button>
              </div>
```

Replace with:

```tsx
              <div className="action-row table-action-row">
                <button className="btn-secondary" onClick={onBack}>
                  Back
                </button>
              </div>
```

- [ ] **Step 3: Add "Repos" column to the author table**

Find the table header:

```tsx
                <thead>
                  <tr>
                    <th aria-label="selected" />
                    <th>Name</th>
                    <th>Email</th>
                    <th className="numeric-cell">Commits</th>
                  </tr>
                </thead>
```

Replace with:

```tsx
                <thead>
                  <tr>
                    <th aria-label="selected" />
                    <th>Name</th>
                    <th>Email</th>
                    <th className="numeric-cell">Repos</th>
                    <th className="numeric-cell">Commits</th>
                  </tr>
                </thead>
```

Find the table row content:

```tsx
                        <td className="muted-cell">{author.email}</td>
                        <td className="numeric-cell muted-cell">
                          {author.commitCount.toLocaleString()}
                        </td>
```

Replace with:

```tsx
                        <td className="muted-cell">{author.email}</td>
                        <td className="numeric-cell muted-cell">
                          {author.repoCount.toLocaleString()}
                        </td>
                        <td className="numeric-cell muted-cell">
                          {author.commitCount.toLocaleString()}
                        </td>
```

- [ ] **Step 4: Update the `AuthorPickPhase` call in `App()` to remove `onExport`**

Find in the App() return JSX:

```tsx
            <AuthorPickPhase
              folderPath={folderPath}
              repos={repos}
              authors={filteredAuthors}
              totalAuthors={authors.length}
              selectedAuthors={selectedAuthors}
              selectedKeys={selectedKeys}
              search={search}
              onSearchChange={setSearch}
              onToggle={toggleAuthor}
              onExport={handleExport}
              onBack={reset}
            />
```

Replace with:

```tsx
            <AuthorPickPhase
              folderPath={folderPath}
              repos={repos}
              authors={filteredAuthors}
              totalAuthors={authors.length}
              selectedAuthors={selectedAuthors}
              selectedKeys={selectedKeys}
              search={search}
              onSearchChange={setSearch}
              onToggle={toggleAuthor}
              onBack={reset}
            />
```

- [ ] **Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(renderer): add repos column, relocate export button to context panel"
```

---

### Task 11: Renderer — DonePhase overhaul

**Covers:** [S9]

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add `formatDuration` helper**

Add after the `authorKey` function at the bottom of the file:

```tsx
function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`
}
```

- [ ] **Step 2: Replace `DonePhase`**

Find and replace the existing `DonePhase` function:

```tsx
function DonePhase({ outputPath, onReset }: { outputPath: string; onReset: () => void }) {
  return (
    <section className="phase-screen phase-screen-centered">
      <div className="done-card surface-card">
        <span className="eyebrow">Export complete</span>
        <h2>Markdown portfolio generated</h2>
        <p>
          GitFolio finished exporting the selected contribution history. The resulting markdown file
          is ready at the path below.
        </p>

        <div className="path-block">
          <span>Output path</span>
          <code>{outputPath}</code>
        </div>

        <div className="action-row action-row-centered">
          <button className="btn-primary" onClick={onReset}>
            Start Over
          </button>
        </div>
      </div>
    </section>
  )
}
```

Replace with:

```tsx
function DonePhase({
  outputPath,
  exportedRepos,
  exportedAuthors,
  exportedCommits,
  exportDuration,
  onReset
}: {
  outputPath: string
  exportedRepos: number
  exportedAuthors: number
  exportedCommits: number
  exportDuration: number | null
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(outputPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="phase-screen phase-screen-centered">
      <div className="done-card surface-card">
        <div className="done-header">
          <span className="done-check">✓</span>
          <div>
            <span className="eyebrow">Export complete</span>
            <h2>Markdown portfolio generated</h2>
          </div>
        </div>

        <div className="done-stats-grid">
          <StatCard label="Repositories" value={exportedRepos.toLocaleString()} />
          <StatCard label="Authors" value={exportedAuthors.toLocaleString()} accent />
          <StatCard label="Commits" value={exportedCommits.toLocaleString()} />
          <StatCard
            label="Time"
            value={exportDuration !== null ? formatDuration(exportDuration) : '—'}
          />
        </div>

        <div className="path-block">
          <span>Output path</span>
          <code>{outputPath}</code>
        </div>

        <div className="done-actions">
          <button className="btn-secondary" onClick={() => window.api.openFile(outputPath)}>
            Open File
          </button>
          <button className="btn-secondary" onClick={() => window.api.showInFolder(outputPath)}>
            Open Folder
          </button>
          <button className="btn-secondary" onClick={handleCopyPath}>
            {copied ? 'Copied!' : 'Copy Path'}
          </button>
          <button className="btn-primary" onClick={onReset}>
            Start Over
          </button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS — zero errors across all files.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat(renderer): DonePhase with stats and 4 action buttons"
```

---

### Task 12: Verify

**Covers:** All spec sections

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run full typecheck**

```bash
bun run typecheck
```

Expected: PASS with zero errors.

- [ ] **Step 2: Run the full test suite**

```bash
bun run test
```

Expected: PASS — all tests green, including the updated authors tests.

- [ ] **Step 3: Remove unused CSS from `index.css`**

Search for and delete these now-unused blocks in `index.css` (they belong to `ProgressPhase` which was removed):

```css
.progress-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-track {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-lg);
  background: var(--accent);
  transition: width 0.2s ease;
}

.progress-meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
}
```

Also delete the `.progress-stats-grid` rule (it was used only in `ProgressPhase`):

```css
.stats-grid,
.progress-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
```

Replace with just:

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
```

- [ ] **Step 4: Run typecheck again after CSS cleanup**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Final commit**

```bash
git add src/renderer/src/index.css
git commit -m "chore(css): remove unused ProgressPhase styles"
```
