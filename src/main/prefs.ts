import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { RecentSelection } from '../shared/types'

interface PrefsData {
  recentSelections: RecentSelection[]
}

const MAX_RECENT_SELECTIONS = 5

export class PrefsStore {
  private readonly filePath: string
  private data: PrefsData

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'prefs.json')
    this.data = this.load()
  }

  getRecentSelections(): RecentSelection[] {
    return this.data.recentSelections
  }

  saveRecentSelection(selection: RecentSelection): void {
    const remaining = this.data.recentSelections.filter((item) => item.folderPath !== selection.folderPath)
    this.data.recentSelections = [selection, ...remaining].slice(0, MAX_RECENT_SELECTIONS)
    this.persist()
  }

  removeRecentSelection(folderPath: string): void {
    this.data.recentSelections = this.data.recentSelections.filter(
      (item) => item.folderPath !== folderPath
    )
    this.persist()
  }

  clearRecentSelections(): void {
    this.data.recentSelections = []
    this.persist()
  }

  private load(): PrefsData {
    try {
      return JSON.parse(readFileSync(this.filePath, 'utf8')) as PrefsData
    } catch {
      return { recentSelections: [] }
    }
  }

  private persist(): void {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
  }
}
