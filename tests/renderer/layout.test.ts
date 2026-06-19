import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('renderer layout styles', () => {
  const css = readFileSync(resolve(__dirname, '../../src/renderer/src/index.css'), 'utf8')
  const app = readFileSync(resolve(__dirname, '../../src/renderer/src/App.tsx'), 'utf8')

  test('keeps the app main area scrollable when a phase exceeds the viewport', () => {
    expect(css).toMatch(/\.app-main\s*\{[^}]*overflow:\s*auto;/s)
  })

  test('uses a flexible phase screen for the main content area', () => {
    expect(css).toMatch(/\.phase-screen\s*\{[^}]*flex:\s*1;/s)
    expect(css).toMatch(/\.phase-screen\s*\{[^}]*min-height:\s*0;/s)
  })

  test('keeps author controls in a dedicated sticky command bar inside the author pane', () => {
    expect(app).toContain('className="table-command-bar"')
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*position:\s*sticky;/s)
  })

  test('uses a denser sticky command bar layout so filters stay visible without consuming excess height', () => {
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*padding:\s*12px 16px;/s)
    expect(css).toMatch(/\.table-command-controls\s*\{[^}]*display:\s*grid;/s)
    expect(css).toMatch(/\.table-command-controls\s*\{[^}]*grid-template-columns:\s*minmax\(260px, 1fr\) auto;/s)
  })

  test('gives the sticky command bar stronger pinned separation styling', () => {
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*background:\s*rgba\(29, 24, 21, 0\.98\);/s)
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*box-shadow:\s*0 10px 24px rgba\(0, 0, 0, 0\.18\);/s)
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*backdrop-filter:\s*blur\(12px\);/s)
  })

  test('does not keep the primary author actions in the scrolling summary card', () => {
    expect(app).not.toMatch(/<div className="action-row">[\s\S]*onExport[\s\S]*<\/div>/)
  })

  test('keeps the summary rail compact by removing queued-author detail blocks', () => {
    expect(app).not.toContain('className="selection-preview"')
  })

  test('renders a persistent context panel for workspace stats', () => {
    expect(app).toContain('className="context-panel"')
    expect(app).toContain('className="context-stats"')
    expect(css).toMatch(/\.context-panel\s*\{[^}]*display:\s*flex;/s)
  })

  test('uses one unified sticky command bar for author controls', () => {
    expect(app).toContain('className="table-command-bar"')
    expect(app).not.toContain('className="table-toolbar"')
    expect(app).not.toContain('className="table-actions-bar"')
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*position:\s*sticky;/s)
  })

  test('keeps the top phase strip visually compact', () => {
    expect(css).toMatch(/\.phase-item\s*\{[^}]*white-space:\s*nowrap;/s)
    expect(app).not.toMatch(/className=\{`phase-item phase-item-\$\{state\}`\}[\s\S]*phaseMeta\[item\]\.detail/)
  })

  test('renders a footer status bar during active operations', () => {
    expect(app).toContain('className="app-footer"')
    expect(css).toMatch(/\.app-footer\s*\{[^}]*display:\s*flex;/s)
  })

  test('uses a richer operation placeholder with live activity context', () => {
    expect(app).toContain('currentLabel="Current repository"')
    expect(app).toContain('className="operation-current-label"')
    expect(app).toContain('className="operation-current-value"')
  })

  test('renders grouped author rows with child identity rows', () => {
    expect(app).toContain('author-group-row')
    expect(app).toContain('className="identity-row"')
    expect(app).toContain('className="identity-list"')
  })

  test('uses the approved warm editorial palette tokens', () => {
    expect(css).toContain('--background: #14110f;')
    expect(css).toContain('--surface: #1d1815;')
    expect(css).toContain('--surface-raised: #28211d;')
    expect(css).toContain('--border: #3a302a;')
    expect(css).toContain('--text: #f3eadb;')
    expect(css).toContain('--text-muted: #c4b6a2;')
    expect(css).toContain('--accent: #d9a441;')
    expect(css).toContain('--accent-hover: #e4b65c;')
    expect(css).toContain('--accent-tint: #2d2419;')
    expect(css).toContain('--error: #e0625b;')
    expect(css).toContain('--error-bg: #341512;')
  })

  test('dims completed steps so the current step carries more emphasis', () => {
    expect(css).toMatch(/\.phase-item-complete\s*\{[^}]*opacity:\s*0\.8;/s)
  })

  test('makes Open File the primary action on the completion screen', () => {
    expect(app).toContain('<button className="btn-primary" onClick={() => window.api.openFile(outputPath)}>')
    expect(app).toContain('<button className="btn-secondary" onClick={onReset}>')
  })

  test('gives the done phase a dedicated wide layout inside the main content area', () => {
    expect(app).toContain('className="phase-screen phase-screen-done"')
    expect(app).toContain('className="done-lede"')
    expect(app).toContain('className="done-summary"')
    expect(css).toMatch(/\.phase-screen-done\s*\{[^}]*align-items:\s*stretch;/s)
    expect(css).toMatch(/\.phase-screen-done\s*\{[^}]*justify-content:\s*flex-start;/s)
    expect(css).toMatch(/\.phase-screen-done\s*\{[^}]*padding-top:\s*48px;/s)
    expect(css).toMatch(/\.done-card\s*\{[^}]*width:\s*min\(1120px, 100%\);/s)
  })

  test('keeps the landing hero free of redundant marketing sidecar copy', () => {
    expect(app).not.toContain('Dark, dense, fast')
    expect(app).not.toContain('Terminal-inspired dark mode')
    expect(app).not.toContain('Recent author picks restored per folder')
    expect(app).not.toContain('Single markdown portfolio file')
    expect(app).not.toContain('className="hero-panel"')
    expect(app).not.toContain('className="brand-tag"')
    expect(css).not.toContain('.hero-panel')
    expect(css).not.toContain('.hero-panel-row')
    expect(css).not.toContain('.brand-tag')
  })
})
