import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'

vi.mock('fs', () => {
  return {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn()
  }
})

import { PrefsStore } from '@main/prefs'

const mockReadFileSync = fs.readFileSync as unknown as ReturnType<typeof vi.fn>
const mockWriteFileSync = fs.writeFileSync as unknown as ReturnType<typeof vi.fn>

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

  it('removes a recent selection by folder path', () => {
    const store = new PrefsStore('/tmp/userdata')

    store.saveRecentSelection({ folderPath: '/repos/a', authorKeys: ['Alice|alice@example.com'], timestamp: 1 })
    store.saveRecentSelection({ folderPath: '/repos/b', authorKeys: ['Bob|bob@example.com'], timestamp: 2 })

    store.removeRecentSelection('/repos/a')

    expect(store.getRecentSelections()).toEqual([
      { folderPath: '/repos/b', authorKeys: ['Bob|bob@example.com'], timestamp: 2 }
    ])
    expect(mockWriteFileSync).toHaveBeenCalled()
  })

  it('does nothing when removing a path that does not exist', () => {
    const store = new PrefsStore('/tmp/userdata')

    store.saveRecentSelection({ folderPath: '/repos/a', authorKeys: ['Alice|alice@example.com'], timestamp: 1 })

    store.removeRecentSelection('/repos/missing')

    expect(store.getRecentSelections()).toEqual([
      { folderPath: '/repos/a', authorKeys: ['Alice|alice@example.com'], timestamp: 1 }
    ])
  })

  it('clears all recent selections', () => {
    const store = new PrefsStore('/tmp/userdata')

    store.saveRecentSelection({ folderPath: '/repos/a', authorKeys: ['Alice|alice@example.com'], timestamp: 1 })
    store.saveRecentSelection({ folderPath: '/repos/b', authorKeys: ['Bob|bob@example.com'], timestamp: 2 })

    store.clearRecentSelections()

    expect(store.getRecentSelections()).toEqual([])
    expect(mockWriteFileSync).toHaveBeenCalled()
  })
})
