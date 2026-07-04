import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('GitHub Pages deployment workflow', () => {
  const workflow = readFileSync(resolve(__dirname, '../../.github/workflows/pages.yml'), 'utf8')

  test('deploys the static website from the master branch with GitHub Pages actions', () => {
    expect(workflow).toContain('name: Deploy GitFolio website')
    expect(workflow).toContain('branches:')
    expect(workflow).toContain('- master')
    expect(workflow).toContain('pages: write')
    expect(workflow).toContain('id-token: write')
    expect(workflow).toContain('actions/configure-pages@v5')
    expect(workflow).toContain('actions/upload-pages-artifact@v3')
    expect(workflow).toContain('actions/deploy-pages@v4')
  })

  test('publishes only the website files and screenshots instead of the full repo', () => {
    expect(workflow).toContain('mkdir -p _site/docs/screenshots')
    expect(workflow).toContain('cp index.html website.css .nojekyll _site/')
    expect(workflow).toContain('cp docs/screenshots/*.png _site/docs/screenshots/')
    expect(workflow).toContain('path: _site')
  })
})
