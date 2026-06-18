import { readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import type { RepoInfo } from '../../shared/types'

export function scanRepos(folderPath: string): RepoInfo[] {
  const repos: RepoInfo[] = []
  scan(folderPath, repos, 0)
  return repos
}

function scan(dir: string, repos: RepoInfo[], depth: number): void {
  if (depth > 5) return

  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }

  if (entries.includes('.git')) {
    repos.push({ path: dir, name: basename(dir) })
    return
  }

  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules') continue
    const fullPath = join(dir, entry)
    try {
      if (statSync(fullPath).isDirectory()) {
        scan(fullPath, repos, depth + 1)
      }
    } catch {
      // skip inaccessible entries
    }
  }
}
