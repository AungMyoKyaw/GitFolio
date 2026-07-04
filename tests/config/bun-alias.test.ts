import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('root tsconfig Bun aliases', () => {
  test('defines the main-process aliases Bun test needs at the repo root', () => {
    const tsconfig = JSON.parse(
      readFileSync(resolve(__dirname, '../../tsconfig.json'), 'utf8')
    ) as {
      compilerOptions?: {
        paths?: Record<string, string[]>
      }
    }

    expect(tsconfig.compilerOptions?.paths?.['@main/*']).toEqual(['./src/main/*'])
    expect(tsconfig.compilerOptions?.paths?.['@shared/*']).toEqual(['./src/shared/*'])
  })
})
