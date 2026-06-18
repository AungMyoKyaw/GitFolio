import type { AuthorInfo, ExportOptions, ProgressEvent, RepoInfo } from '../shared/types'

declare global {
  interface Window {
    api: {
      openFolder: () => Promise<string | null>
      saveFile: () => Promise<string | null>
      scanRepos: (folderPath: string) => Promise<RepoInfo[]>
      getAuthors: (repoPaths: string[]) => Promise<AuthorInfo[]>
      exportContributions: (options: ExportOptions) => Promise<void>
      onProgress: (callback: (event: ProgressEvent) => void) => () => void
    }
  }
}
