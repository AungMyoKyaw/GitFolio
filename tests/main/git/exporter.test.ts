import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as childProcess from 'child_process'
import * as fs from 'fs'

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

vi.mock('fs', () => {
  return {
    writeFileSync: vi.fn()
  }
})

import { exportContributions } from '@main/git/exporter'

const mockExecSync = childProcess.execSync as unknown as ReturnType<typeof vi.fn>
const mockWriteFileSync = fs.writeFileSync as unknown as ReturnType<typeof vi.fn>

describe('exportContributions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('exports only commits from the selected exact emails', async () => {
    mockExecSync
      .mockReturnValueOnce(
        Buffer.from(
          'aaa1111|Alice|alice@example.com|2024-01-10|feat: first\n' +
            'bbb2222|Alice|alice@work.com|2024-01-11|feat: second\n' +
            'ccc3333|Alice|alice@someone-else.com|2024-01-12|feat: wrong person\n'
        )
      )
      .mockReturnValueOnce(Buffer.from('diff --git a/src/a.ts b/src/a.ts\n+one\n'))
      .mockReturnValueOnce(Buffer.from('diff --git a/src/b.ts b/src/b.ts\n+two\n'))

    await exportContributions(
      {
        repoPaths: ['/repos/app'],
        authors: [
          { name: 'Alice', email: 'alice@example.com', commitCount: 10, repoCount: 1 },
          { name: 'Alice', email: 'alice@work.com', commitCount: 4, repoCount: 1 }
        ],
        outputPath: '/tmp/report.md'
      },
      () => {}
    )

    const markdown = mockWriteFileSync.mock.calls[0]?.[1] as string
    expect(markdown).toContain('aaa1111')
    expect(markdown).toContain('bbb2222')
    expect(markdown).not.toContain('ccc3333')
    expect(markdown).toContain('# Contribution Report: Alice')
  })

  it('summarizes large commits after the most significant files', async () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      ...Array.from({ length: 30 }, (_, i) => `+a${i}`),
      'diff --git a/src/b.ts b/src/b.ts',
      ...Array.from({ length: 20 }, (_, i) => `+b${i}`),
      'diff --git a/src/c.ts b/src/c.ts',
      ...Array.from({ length: 10 }, (_, i) => `+c${i}`),
      'diff --git a/src/d.ts b/src/d.ts',
      ...Array.from({ length: 5 }, (_, i) => `+d${i}`)
    ].join('\n')

    mockExecSync
      .mockReturnValueOnce(Buffer.from('aaa1111|Alice|alice@example.com|2024-01-10|feat: big\n'))
      .mockReturnValueOnce(Buffer.from(diff))

    await exportContributions(
      {
        repoPaths: ['/repos/app'],
        authors: [{ name: 'Alice', email: 'alice@example.com', commitCount: 1, repoCount: 1 }],
        outputPath: '/tmp/report.md'
      },
      () => {}
    )

    const markdown = mockWriteFileSync.mock.calls[0]?.[1] as string
    expect(markdown).toContain('src/a.ts')
    expect(markdown).toContain('src/b.ts')
    expect(markdown).toContain('src/c.ts')
    expect(markdown).toContain('…and 1 more file(s) not shown')
  })
})
