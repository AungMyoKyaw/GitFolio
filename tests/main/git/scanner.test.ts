import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'

vi.mock('fs', () => {
  return {
    readdirSync: vi.fn(),
    statSync: vi.fn()
  }
})

import { scanRepos } from '@main/git/scanner'

const mockReaddirSync = fs.readdirSync as unknown as ReturnType<typeof vi.fn>
const mockStatSync = fs.statSync as unknown as ReturnType<typeof vi.fn>

function directoryStat() {
  return { isDirectory: () => true } as fs.Stats
}

describe('scanRepos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockStatSync.mockReturnValue(directoryStat())
  })

  it('finds a repo at the current path', () => {
    mockReaddirSync.mockReturnValue(['.git', 'src'] as never)

    expect(scanRepos('/projects/app')).toEqual([{ path: '/projects/app', name: 'app' }])
  })

  it('recursively finds nested repos', () => {
    mockReaddirSync
      .mockReturnValueOnce(['repo-a', 'repo-b'] as never)
      .mockReturnValueOnce(['.git'] as never)
      .mockReturnValueOnce(['.git'] as never)

    expect(scanRepos('/projects')).toEqual([
      { path: '/projects/repo-a', name: 'repo-a' },
      { path: '/projects/repo-b', name: 'repo-b' }
    ])
  })

  it('skips hidden and node_modules directories', () => {
    mockReaddirSync
      .mockReturnValueOnce(['.cache', 'node_modules', 'repo'] as never)
      .mockReturnValueOnce(['.git'] as never)

    expect(scanRepos('/projects')).toEqual([{ path: '/projects/repo', name: 'repo' }])
    expect(mockStatSync).toHaveBeenCalledTimes(1)
  })

  it('skips unreadable directories', () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('EACCES')
    })

    expect(scanRepos('/projects')).toEqual([])
  })
})
