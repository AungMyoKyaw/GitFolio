export interface RepoInfo {
  path: string
  name: string
}

export interface AuthorInfo {
  name: string
  email: string
  commitCount: number
  repoCount: number
}

export interface RecentSelection {
  folderPath: string
  authorKeys: string[]
  timestamp: number
}

export interface ExportOptions {
  repoPaths: string[]
  authors: AuthorInfo[]
  outputPath: string
}

export interface ProgressEvent {
  phase: 'scanning' | 'authors' | 'exporting'
  current: number
  total: number
  message: string
}
