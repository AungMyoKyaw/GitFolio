import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('renderer layout styles', () => {
  const css = readFileSync(resolve(__dirname, '../../src/renderer/src/index.css'), 'utf8')
  const app = readFileSync(resolve(__dirname, '../../src/renderer/src/App.tsx'), 'utf8')

  test('keeps the app main area scrollable when a phase exceeds the viewport', () => {
    expect(css).toMatch(/\.app-main\s*\{[^}]*overflow:\s*auto;/s)
  })

  test('lets the author phase scroll instead of clipping content', () => {
    expect(css).toMatch(/\.phase-screen-fill\s*\{[^}]*min-height:\s*100%;/s)
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

  test('moves folder context into the author work pane', () => {
    expect(app).toContain('className="table-context-row"')
  })

  test('uses one unified sticky command bar for author controls', () => {
    expect(app).toContain('className="table-command-bar"')
    expect(app).not.toContain('className="table-toolbar"')
    expect(app).not.toContain('className="table-actions-bar"')
    expect(css).toMatch(/\.table-command-bar\s*\{[^}]*position:\s*sticky;/s)
  })

  test('keeps the top phase strip visually compact', () => {
    expect(css).toMatch(/\.phase-item\s*\{[^}]*min-height:\s*56px;/s)
    expect(app).not.toMatch(/className=\{`phase-item phase-item-\$\{state\}`\}[\s\S]*phaseMeta\[item\]\.detail/)
  })
})
