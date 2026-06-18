import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs')
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn()
  }
})

import { PrefsStore } from '@main/prefs'

const mockReadFileSync = vi.mocked(fs.readFileSync)
const mockWriteFileSync = vi.mocked(fs.writeFileSync)

describe('PrefsStore', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockReadFileSync.mockImplementation(() => {
      throw new Error('missing')
    })
  })

  it('starts empty when no prefs file exists', () => {
    const store = new PrefsStore('/tmp/userdata')
    expect(store.getRecentSelections()).toEqual([])
  })

  it('stores recent selections newest first and deduplicates by folder', () => {
    const store = new PrefsStore('/tmp/userdata')

    store.saveRecentSelection({ folderPath: '/repos/a', authorKeys: ['Alice|alice@example.com'], timestamp: 1 })
    store.saveRecentSelection({ folderPath: '/repos/b', authorKeys: ['Bob|bob@example.com'], timestamp: 2 })
    store.saveRecentSelection({ folderPath: '/repos/a', authorKeys: ['Alice|alice@work.com'], timestamp: 3 })

    expect(store.getRecentSelections()).toEqual([
      { folderPath: '/repos/a', authorKeys: ['Alice|alice@work.com'], timestamp: 3 },
      { folderPath: '/repos/b', authorKeys: ['Bob|bob@example.com'], timestamp: 2 }
    ])
    expect(mockWriteFileSync).toHaveBeenCalled()
  })
})
