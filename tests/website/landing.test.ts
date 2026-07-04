import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('product website landing page', () => {
  const htmlPath = resolve(__dirname, '../../index.html')
  const cssPath = resolve(__dirname, '../../website.css')
  const html = readFileSync(htmlPath, 'utf8')
  const css = () => readFileSync(cssPath, 'utf8')

  test('loads the standalone website stylesheet instead of the app bundle', () => {
    expect(existsSync(cssPath)).toBe(true)
    expect(html).toContain('<link rel="stylesheet" href="website.css" />')
    expect(html).not.toContain('/src/renderer/src/main.tsx')
  })

  test('leads with the approved proof-of-work positioning', () => {
    expect(html).toContain('Turn local git history into proof of work')
    expect(html).toContain(
      'GitFolio scans your cloned repositories, groups author identities, and exports a readable Markdown portfolio with commits and diffs.'
    )
  })

  test('uses real product screenshots from the repository', () => {
    expect(html).toContain('docs/screenshots/02-scan-repositories.png')
    expect(html).toContain('docs/screenshots/03-select-authors.png')
    expect(html).toContain('docs/screenshots/05-complete.png')
  })

  test('covers the required product story sections', () => {
    expect(html).toContain('id="problem"')
    expect(html).toContain('id="workflow"')
    expect(html).toContain('id="output"')
    expect(html).toContain('id="local-first"')
    expect(html).toContain('id="use-cases"')
    expect(html).toContain('id="install"')
  })

  test('makes local-first trust explicit without implying cloud sync', () => {
    expect(html).toContain('Runs on your machine')
    expect(html).toContain('No cloud account required')
    expect(html).toContain('User decides what to share after export')
    expect(html).not.toMatch(/syncs? your repositories/i)
    expect(html).not.toMatch(/uploads? your repositories/i)
  })

  test('includes source build commands and git requirement', () => {
    expect(html).toContain('https://github.com/AungMyoKyaw/GitFolio')
    expect(html).toContain('https://github.com/AungMyoKyaw/GitFolio/releases/latest')
    expect(html).toContain('Download latest release')
    expect(html).toContain('Download for macOS')
    expect(html).toContain('Download for Windows')
    expect(html).toContain('Download for Linux')
    expect(html).not.toContain('your-org/gitfolio')
    expect(html).toContain('bun install')
    expect(html).toContain('bun run package')
    expect(html).toContain('git must be available on your PATH')
  })

  test('uses the GitFolio product palette and mobile breakpoints', () => {
    expect(existsSync(cssPath)).toBe(true)
    if (!existsSync(cssPath)) return

    const stylesheet = css()
    expect(stylesheet).toContain('--background: #14110f;')
    expect(stylesheet).toContain('--surface: #1d1815;')
    expect(stylesheet).toContain('--text: #f3eadb;')
    expect(stylesheet).toContain('--accent: #d9a441;')
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*760px\)/)
  })
})
