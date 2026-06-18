# User Story: GitFolio

## As a
Developer who has worked across many git repositories over the years

## I want to
Point the tool at a folder full of cloned git repos, pick an author (me or anyone else), and get a single consolidated markdown file of all their contributions across all repos.

## So that
I can quickly see "what the fuck did I actually do" — useful for resumes, performance reviews, portfolio building, or just remembering what you worked on.

---

## Acceptance Criteria

### 1. Folder Scanning
- **Given** a folder path (e.g., `~/projects/` or `~/work/`)
- **When** the user runs the tool
- **Then** it recursively scans for `.git` directories and identifies all valid git repositories
- **And** it handles nested folders (repos inside repos, monorepos, etc.) gracefully
- **And** it skips non-git folders silently — no noise

### 2. Author Discovery
- **Given** all discovered repos
- **When** the scan completes
- **Then** the tool extracts all unique authors (by name + email) from `git log` across all repos
- **And** presents a deduplicated list — same person with different emails should be grouped or flagged
- **And** shows a count of commits per author for quick reference

### 3. Author Search & Selection
- **Given** the list of authors
- **When** the user wants to find someone
- **Then** they can type to filter/search by name or email
- **And** select one or multiple authors (multi-select for "me + my other email")
- **And** the tool remembers recent selections for quick re-runs

### 4. Contribution Export
- **Given** a selected author
- **When** the user triggers export
- **Then** the tool pulls all commits from that author across all repos
- **And** for each commit, captures: repo name, commit hash, date, message, files changed, **and the actual code diff**
- **And** writes everything to **one single markdown file**
- **And** the markdown is organized by repo, then chronologically
- **And** includes a summary at the top: total repos, total commits, date range
- **And** for each file changed, includes the **diff snippet** so AI (or the user) can see *what* actually changed, not just *that* it changed

### 5. Output Format
- **The markdown file** should look like:
  ````markdown
  # Contribution Report: [Author Name]

  - **Total Repos:** 47
  - **Total Commits:** 1,247
  - **Date Range:** 2019-03-12 → 2024-11-28

  ---

  ## Repo: my-cool-project

  ### 2024-11-28 — abc1234
  **feat:** add dark mode toggle

  #### `src/components/ThemeToggle.tsx`
  ```diff
  + import { useState, useEffect } from 'react';
  +
  + export function ThemeToggle() {
  +   const [dark, setDark] = useState(false);
  +   useEffect(() => {
  +     document.documentElement.classList.toggle('dark', dark);
  +   }, [dark]);
  +   return (
  +     <button onClick={() => setDark(!dark)}>
  +       {dark ? '🌙' : '☀️'}
  +     </button>
  +   );
  + }
  ```

  #### `src/styles/theme.css`
  ```diff
  + .dark {
  +   --bg: #111;
  +   --fg: #eee;
  + }
  ```

  ### 2024-11-25 — def5678
  **fix:** resolve race condition in auth flow

  #### `src/auth/AuthProvider.tsx`
  ```diff
    const refreshToken = async () => {
  -   const resp = await fetch('/refresh');
  -   setToken(resp.token);
  +   const resp = await fetch('/refresh', { cache: 'no-store' });
  +   if (resp.ok) setToken(resp.token);
    };
  ```

  ---

  ## Repo: another-repo
  ...
  ````

- **Rules for diff inclusion:**
  - Include the **full diff** for small commits (< 50 lines changed)
  - For **large commits**, include the diff for the most significant file(s) and summarize the rest
  - Skip **binary files**, lockfile churn (e.g., `package-lock.json`, `yarn.lock`, `Podfile.lock`), and generated artifacts
  - Cap **per-file diff** at ~200 lines; truncate with `<!-- ... truncated ... -->` if exceeded
  - Use ` ```diff ` code blocks so AI parsers and markdown renderers handle it correctly
  - Prefix each diff block with the filename as a heading (`#### path/to/file.ext`)

### 6. Performance & Scale
- **Given** potentially hundreds of repos
- **When** scanning and exporting
- **Then** the tool runs in parallel where possible (async/parallel git log)
- **And** shows progress (spinner or progress bar)
- **And** doesn't choke on repos with 10k+ commits
- **And** caches scan results for subsequent runs (optional but nice)

### 7. Edge Cases
- **Given** repos with no commits, or empty repos
- **When** scanning
- **Then** skip them without crashing
- **Given** repos the user doesn't have read access to
- **Then** skip them, maybe log a warning
- **Given** author names with Unicode or special characters
- **Then** handle them correctly in the markdown output

---

## Nice-to-Haves (Future)
- Config file to exclude certain repos or folders
- Export as HTML or PDF instead of markdown
- GitHub API integration to fetch PRs and issues too (not just commits)
- Filter by date range ("only show me 2024 contributions")
- Group by project/organization
- Pie chart of languages used (via file extensions in commits)
- Word cloud of commit messages (why not)

---

## Technical Notes (for the dev)
- **App type:** Electron desktop app (cross-platform, native file system access, easy UI)
- **Frontend:** React/Vue/Svelte with a simple UI for folder selection, author search, and progress
- **Git access:** Shell out to `git log` and `git diff` via Node.js `child_process` (simplest and most reliable)
- **Markdown generation:** Template strings on the main process, write to user-selected path
- **UI components needed:**
  - Folder picker (drag-and-drop or file dialog)
  - Searchable author list with checkboxes
  - Progress bar for scan + export phases
  - Settings panel (exclude patterns, diff size limits, etc.)
- **The core logic:** `git log --all --format="%H|%an|%ae|%ad|%s" --author="name"` + `git show <hash> --patch` across all repos

---

## User Pain Points This Solves
1. **"I know I did something in one of these 50 repos but I can't remember which"**
2. **"I need to write a self-review and I forgot what I shipped this year"**
3. **"My resume says 'extensive open source contributions' — I need to prove it"**
4. **"I want to see my career progression by looking at my actual code over time"**
5. **"I have 5 different git emails and my contributions are scattered"**

---

## MVP Scope
- Electron app, pick a folder, scan repos, list authors, pick one, export markdown. That's it. Ship it.
