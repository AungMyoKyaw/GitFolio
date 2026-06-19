import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as childProcess from 'child_process'

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

import { getAuthors } from '@main/git/authors'

const mockExecSync = childProcess.execSync as unknown as ReturnType<typeof vi.fn>

describe('getAuthors', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('aggregates commit counts per name and email', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('Alice|alice@example.com\nAlice|alice@example.com\nBob|bob@example.com\n')
    )

    const progress: string[] = []
    const authors = await getAuthors(['/repos/a'], (event) => progress.push(event.message))

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 2, repoCount: 1 },
      { name: 'Bob', email: 'bob@example.com', commitCount: 1, repoCount: 1 }
    ])
    expect(progress).toEqual(['Scanning authors in a'])
  })

  it('keeps same-name different-email authors separate', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('Alice|alice@example.com\nAlice|alice@work.com\n')
    )

    const authors = await getAuthors(['/repos/a'], () => {})

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 1, repoCount: 1 },
      { name: 'Alice', email: 'alice@work.com', commitCount: 1, repoCount: 1 }
    ])
  })

  it('counts repoCount across multiple repos', async () => {
    mockExecSync
      .mockReturnValueOnce(Buffer.from('Alice|alice@example.com\n'))
      .mockReturnValueOnce(Buffer.from('Alice|alice@example.com\n'))

    const authors = await getAuthors(['/repos/a', '/repos/b'], () => {})

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 2, repoCount: 2 }
    ])
  })

  it('counts repoCount as 1 when author appears in only one of two repos', async () => {
    mockExecSync
      .mockReturnValueOnce(Buffer.from('Alice|alice@example.com\n'))
      .mockReturnValueOnce(Buffer.from('Bob|bob@example.com\n'))

    const authors = await getAuthors(['/repos/a', '/repos/b'], () => {})

    expect(authors).toEqual([
      { name: 'Alice', email: 'alice@example.com', commitCount: 1, repoCount: 1 },
      { name: 'Bob', email: 'bob@example.com', commitCount: 1, repoCount: 1 }
    ])
  })

  it('skips repos that error', async () => {
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('bad repo')
    })

    const authors = await getAuthors(['/repos/a'], () => {})
    expect(authors).toEqual([])
  })
})
