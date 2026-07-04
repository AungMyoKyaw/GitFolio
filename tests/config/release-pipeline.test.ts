import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('Electron release pipeline', () => {
  const root = resolve(__dirname, '../..')
  const builderConfig = readFileSync(resolve(root, 'electron-builder.config.cjs'), 'utf8')
  const packageJson = readFileSync(resolve(root, 'package.json'), 'utf8')
  const releaseWorkflowPath = resolve(root, '.github/workflows/release.yml')
  const releaseWorkflow = existsSync(releaseWorkflowPath)
    ? readFileSync(releaseWorkflowPath, 'utf8')
    : ''

  test('configures electron-builder for GitHub releases on all desktop platforms', () => {
    expect(builderConfig).toContain("icon: 'build/icon.png'")
    expect(builderConfig).toContain("icon: 'build/icon.icns'")
    expect(builderConfig).toContain("icon: 'build/icon.ico'")
    expect(builderConfig).toContain("provider: 'github'")
    expect(builderConfig).toContain("releaseType: 'release'")
    expect(builderConfig).toContain('artifactName')
    expect(builderConfig).toContain('dmg')
    expect(builderConfig).toContain('zip')
    expect(builderConfig).toContain('nsis')
    expect(builderConfig).toContain('portable')
    expect(builderConfig).toContain('AppImage')
    expect(builderConfig).toContain('deb')
  })

  test('adds platform packaging scripts for local and CI use', () => {
    expect(packageJson).toContain('"package:mac"')
    expect(packageJson).toContain('"package:win"')
    expect(packageJson).toContain('"package:linux"')
    expect(packageJson).toContain('"release:mac"')
    expect(packageJson).toContain('"release:win"')
    expect(packageJson).toContain('"release:linux"')
  })

  test('defines a tag-triggered release workflow using latest Node LTS and Bun', () => {
    expect(releaseWorkflow).toContain('name: Build and release desktop apps')
    expect(releaseWorkflow).toContain("tags:")
    expect(releaseWorkflow).toContain("'v*.*.*'")
    expect(releaseWorkflow).toContain('contents: write')
    expect(releaseWorkflow).toContain('node-version: lts/*')
    expect(releaseWorkflow).toContain('oven-sh/setup-bun@v2')
    expect(releaseWorkflow).toContain('bun-version: canary')
    expect(releaseWorkflow).toContain('bun install --frozen-lockfile')
    expect(releaseWorkflow).toContain('verify:')
    expect(releaseWorkflow).toContain('needs: verify')
    expect(releaseWorkflow).toContain('bun run test')
    expect(releaseWorkflow).toContain('CSC_IDENTITY_AUTO_DISCOVERY: false')
    expect(releaseWorkflow).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}')
    expect(releaseWorkflow).toContain('release-script: release:mac')
    expect(releaseWorkflow).toContain('release-script: release:win')
    expect(releaseWorkflow).toContain('release-script: release:linux')
    expect(releaseWorkflow).toContain('bun run ${{ matrix.release-script }}')
  })

  test('includes repo-native application icon assets', () => {
    const iconPath = resolve(root, 'build/icon.svg')
    expect(existsSync(iconPath)).toBe(true)
    expect(existsSync(resolve(root, 'build/icon.icns'))).toBe(true)
    expect(existsSync(resolve(root, 'build/icon.ico'))).toBe(true)
    expect(existsSync(resolve(root, 'build/icon.png'))).toBe(true)
    if (!existsSync(iconPath)) return

    const icon = readFileSync(iconPath, 'utf8')
    expect(icon).toContain('<svg')
    expect(icon).toContain('GitFolio')
    expect(icon).toContain('#d9a441')
    expect(icon).toContain('#14110f')
  })
})
