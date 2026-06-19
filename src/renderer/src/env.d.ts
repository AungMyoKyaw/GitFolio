/// <reference types="vite/client" />

import type {
  AuthorInfo,
  ExportOptions,
  ProgressEvent,
  RecentSelection,
  RepoInfo
} from '../../shared/types'

declare global {
  interface Window {
    api: {
      openFolder: () => Promise<string | null>
      saveFile: () => Promise<string | null>
      scanRepos: (folderPath: string) => Promise<RepoInfo[]>
      getAuthors: (repoPaths: string[]) => Promise<AuthorInfo[]>
      exportContributions: (options: ExportOptions) => Promise<void>
      getRecentSelections: () => Promise<RecentSelection[]>
      saveRecentSelection: (selection: RecentSelection) => Promise<void>
      openFile: (path: string) => Promise<void>
      showInFolder: (path: string) => Promise<void>
      onProgress: (callback: (event: ProgressEvent) => void) => () => void
    }
  }
}
