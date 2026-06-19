# Audit Follow-Ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add author identity grouping and the approved UX polish from the latest audit.

**Architecture:** Keep the existing single-screen renderer structure, add a small grouping layer in `App.tsx`, and enrich progress payloads so scan and export screens can surface the current repository in the center panel. Preserve the current export contract by flattening selected grouped identities back to the existing `AuthorInfo[]` shape before export.

**Tech Stack:** Electron, React, TypeScript, Vitest

---

### Task 1: Lock the new renderer and author expectations with tests

**Files:**
- Modify: `tests/renderer/layout.test.ts`
- Modify: `tests/main/git/authors.test.ts`

- [x] **Step 1: Write the failing renderer assertions**

```ts
test('renders grouped author affordances and makes Open File the primary done action', () => {
  expect(app).toContain('className="author-group-row"')
  expect(app).toContain('className="identity-row"')
  expect(app).toContain('className="btn-primary" onClick={() => window.api.openFile(outputPath)}')
})

test('dims completed phase items and brightens muted body copy', () => {
  expect(css).toMatch(/\.phase-item-complete\s*\{[^}]*opacity:\s*0\.8;/s)
  expect(css).toContain('--text-muted: #c4b6a2;')
})
```

- [x] **Step 2: Run the renderer test file and confirm failure**

Run: `bun test tests/renderer/layout.test.ts`
Expected: FAIL because grouped rows and updated CTA styling do not exist yet.

- [x] **Step 3: Write the failing author aggregation assertion**

```ts
expect(result[0]).toMatchObject({
  name: 'Aung Myo Kyaw',
  identities: [
    { email: 'developer@example.com' },
    { email: 'personal@example.com' }
  ]
})
```

- [x] **Step 4: Run the author test file and confirm failure**

Run: `bun test tests/main/git/authors.test.ts`
Expected: FAIL because `AuthorInfo` does not yet expose grouped identities.

### Task 2: Add grouped author data and richer operation activity context

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/main/git/authors.ts`
- Modify: `src/main/git/exporter.ts`
- Modify: `src/renderer/src/App.tsx`

- [x] **Step 1: Extend the shared types for grouped identities and current target labels**

```ts
export interface AuthorIdentity {
  name: string
  email: string
  commitCount: number
  repoCount: number
}

export interface AuthorInfo {
  name: string
  email: string
  commitCount: number
  repoCount: number
  identities?: AuthorIdentity[]
}

export interface ProgressEvent {
  phase: 'scanning' | 'authors' | 'exporting'
  current: number
  total: number
  message: string
  currentTarget?: string
}
```

- [x] **Step 2: Update author aggregation to group by normalized name while retaining child identities**

```ts
const groups = new Map<string, { name: string; commitCount: number; repoPaths: Set<string>; identities: Map<string, AuthorIdentity> }>()

const groupKey = name.toLowerCase()
const identityKey = `${name.toLowerCase()}|${email.toLowerCase()}`
```

- [x] **Step 3: Keep export behavior compatible by flattening grouped selections to emails**

```ts
const selectedEmails = new Set(
  authors.flatMap((author) => author.identities?.map((identity) => identity.email.toLowerCase()) ?? [author.email.toLowerCase()])
)
```

- [x] **Step 4: Replace the flat author table with expandable grouped rows and use progress target text in the scan/export placeholder**

```tsx
<OperationPlaceholder
  phaseLabel="Repository discovery"
  title="Scanning for git histories"
  currentLabel="Current repository"
  currentValue={progress?.currentTarget ?? progress?.message}
/>
```

```tsx
<tr className="author-group-row">
  <td><button>{expanded ? '▾' : '▸'}</button></td>
  <td><strong>{group.name}</strong></td>
  <td>{group.identities.length} identities</td>
  <td className="numeric-cell">{group.repoCount.toLocaleString()}</td>
  <td className="numeric-cell">{group.commitCount.toLocaleString()}</td>
</tr>
```

- [x] **Step 5: Run the focused renderer and author tests**

Run: `bun test tests/renderer/layout.test.ts tests/main/git/authors.test.ts`
Expected: PASS

### Task 3: Apply the remaining visual polish and verify the app-level behavior

**Files:**
- Modify: `src/renderer/src/index.css`
- Modify: `src/renderer/src/App.tsx`

- [x] **Step 1: Dim completed steps, brighten muted text, and make the done-screen primary action match the audit**

```css
.phase-item-complete {
  opacity: 0.8;
}

:root {
  --text-muted: #c4b6a2;
}
```

```tsx
<button className="btn-primary" onClick={() => window.api.openFile(outputPath)}>
  Open File
</button>
```

- [x] **Step 2: Run the renderer suite**

Run: `bun test tests/renderer/layout.test.ts`
Expected: PASS

- [x] **Step 3: Run the full project verification command**

Run: `bun test`
Expected: PASS
