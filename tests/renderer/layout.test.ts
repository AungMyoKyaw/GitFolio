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
  })

  test('keeps author controls in a dedicated sticky command bar inside the author pane', () => {
    expect(app).toContain('className="table-command-bar"')
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*position:\s*sticky;/s)
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

  test('uses the approved warm editorial palette tokens', () => {
    expect(css).toContain('--background: #14110f;')
    expect(css).toContain('--surface: #1d1815;')
    expect(css).toContain('--surface-raised: #28211d;')
    expect(css).toContain('--border: #3a302a;')
    expect(css).toContain('--text: #f3eadb;')
    expect(css).toContain('--text-muted: #b6a792;')
    expect(css).toContain('--accent: #d9a441;')
    expect(css).toContain('--accent-hover: #e4b65c;')
    expect(css).toContain('--accent-tint: #2d2419;')
    expect(css).toContain('--error: #e0625b;')
    expect(css).toContain('--error-bg: #341512;')
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
