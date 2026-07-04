# GitFolio Product Website Design

> **Status:** Draft for review  
> **Date:** 2026-07-04  
> **Scope:** Public product website for GitFolio

## Problem

Developers often have years of useful work spread across many cloned repositories, Git author identities, and commit histories. When they need evidence for a resume, interview, performance review, portfolio, or personal review, the work is technically available but hard to collect into a readable artifact.

GitFolio already solves this with a local desktop workflow: choose a folder, scan repositories, group author identities, and export a Markdown contribution portfolio with commits and diffs. The website should make that value obvious without overselling the app as a cloud platform or generic SaaS product.

## Audience

The primary audience is developers who want credible proof of work from their own git history.

Secondary audiences:

- Hiring managers and recruiters who need to understand what the exported artifact proves.
- Developers preparing performance review packets.
- Developers building personal portfolios or shipped-work archives.

The site should speak to the developer user first, then make the career and review use cases concrete.

## Positioning

Primary promise:

> Turn local git history into proof of work.

Supporting message:

> GitFolio scans your cloned repositories, groups author identities, and exports a readable Markdown portfolio with commits and diffs.

Core attributes:

- Local-first: the app reads local cloned repositories and produces a local `.md` file.
- Evidence-backed: exported portfolios include commits, chronology, repositories, and diffs.
- Practical: the workflow is focused on getting from scattered git history to one usable document.
- Portable: Markdown output works in editors, resumes, review packets, and AI-assisted summarization.

## Recommended Approach

Use a proof-of-work product landing page.

This approach is stronger than a documentation-only site because it quickly explains why GitFolio matters, while still staying honest about the product. It is also safer than a highly narrative career-marketing page because GitFolio is a focused desktop utility and should not overpromise job outcomes.

The site should feel like a serious developer tool: direct copy, real screenshots, concrete output examples, and a restrained visual system.

## Information Architecture

### 1. Hero

Goal: explain the product in one screen and show that it is real.

Content:

- Product name: `GitFolio`
- Headline: `Turn local git history into proof of work`
- Subcopy: `GitFolio scans your cloned repositories, groups author identities, and exports a readable Markdown portfolio with commits and diffs.`
- Primary CTA: `Download for macOS`
- Secondary CTA: `View on GitHub` or `Build from source`
- Visual: a real GitFolio app screenshot paired with a compact Markdown output preview.

If no packaged release is available, the primary CTA should be `View on GitHub` and the build-from-source command should appear in the install section.

### 2. Problem

Goal: create immediate recognition.

Message:

- Work is spread across repos, emails, branches, and time.
- Git logs are powerful but not presentation-ready.
- Review and portfolio moments need a clean artifact, not a manual archaeology session.

### 3. Workflow

Goal: show that the app is simple and bounded.

Steps:

1. Pick a folder containing cloned repositories.
2. Scan repositories and author identities.
3. Select one or more author identities.
4. Export a Markdown contribution portfolio.

Each step should use concise copy and, where possible, existing screenshots from `docs/screenshots/`.

### 4. Output

Goal: prove the artifact quality.

Show an example report with:

- Total repositories, commits, and date range.
- Repository sections.
- Chronological commits.
- Per-file `diff` blocks.
- Generated and oversized files omitted or capped for readability.

The output preview should be visually scannable and should not require users to read a long code sample before understanding the benefit.

### 5. Local-First Trust

Goal: address privacy and ownership.

Points:

- Runs as a desktop app.
- Reads local cloned repositories.
- No cloud account required.
- Exports a plain Markdown file.
- User decides what to share after export.

Avoid implying that GitFolio sends repository data anywhere unless a future feature actually does so.

### 6. Use Cases

Goal: connect the same product to multiple real needs.

Cards or compact rows:

- Resume evidence: collect shipped work before rewriting a resume.
- Interview prep: refresh project details and implementation examples.
- Performance reviews: assemble a contribution packet from the review period.
- Personal archive: keep a durable record of what was shipped.

### 7. Install

Goal: make the next step clear.

Content:

- GitHub Releases path for `.dmg` or `.zip` when available.
- Source build commands:

```bash
bun install
bun run package
```

Also mention that `git` must be available on the user's PATH.

## Visual Direction

Reuse the existing GitFolio identity from `DESIGN.md`.

Style:

- Dark charcoal background.
- Warm paper-tinted text.
- Restrained amber for primary actions and progress accents.
- Real screenshots rather than abstract illustrations.
- Compact, editorial developer-tool layout.

The first viewport should make the product unmistakable: product name, clear headline, useful CTA, and a real product visual. Avoid generic SaaS gradients, oversized decorative shapes, and vague productivity language.

## Content Tone

Use direct, practical copy.

Good:

- `Generate a Markdown portfolio from your local git history.`
- `Group author identities before export.`
- `Keep the final artifact local until you choose to share it.`

Avoid:

- Job-outcome promises.
- Vague productivity claims.
- Cloud or team-platform language.
- Overstating roadmap features such as PDF, GitHub API integration, or language breakdown before they exist.

## Component Plan

The eventual implementation can be a static marketing page in this repository unless a separate website project is chosen later.

Suggested components:

- `Hero`
- `ScreenshotShowcase`
- `ProblemSection`
- `WorkflowSteps`
- `OutputPreview`
- `TrustSection`
- `UseCaseGrid`
- `InstallSection`
- `SiteFooter`

Use existing screenshots from `docs/screenshots/` where possible. If the screenshots are too app-focused for the hero composition, create a website-specific composite from those assets rather than inventing fake product UI.

## Testing And Verification

For implementation, verify:

- Desktop and mobile layouts.
- Hero text does not overlap the product visual.
- CTAs point to valid local or public targets.
- Screenshots load from the expected paths.
- Copy does not claim unavailable features.
- Build and typecheck pass using the repo's Bun scripts.

## Open Decisions

- Whether the primary CTA should be `Download for macOS` or `View on GitHub` depends on release availability at implementation time.
- Whether the website lives as a static page in this Electron repo or in a separate site repo can be decided during implementation planning.
