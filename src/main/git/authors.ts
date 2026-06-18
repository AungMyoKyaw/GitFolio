import { execSync } from 'child_process'
import type { AuthorInfo, ProgressEvent } from '../../shared/types'

type ProgressCallback = (event: ProgressEvent) => void

export async function getAuthors(
  repoPaths: string[],
  onProgress: ProgressCallback
): Promise<AuthorInfo[]> {
  const authorMap = new Map<string, AuthorInfo>()

  for (let i = 0; i < repoPaths.length; i++) {
    const repoPath = repoPaths[i]
    onProgress({
      phase: 'authors',
      current: i + 1,
      total: repoPaths.length,
      message: `Scanning authors in ${repoPath.split('/').pop()}`
    })

    try {
      const output = execSync('git log --all --format="%an|%ae"', {
        cwd: repoPath,
        timeout: 30000,
        maxBuffer: 50 * 1024 * 1024
      }).toString()

      for (const line of output.split('\n')) {
        const trimmed = line.trim().replace(/^"|"$/g, '')
        if (!trimmed) continue
        const sep = trimmed.indexOf('|')
        if (sep === -1) continue
        const name = trimmed.slice(0, sep).trim()
        const email = trimmed.slice(sep + 1).trim()
        if (!name || !email) continue
        const key = `${name.toLowerCase()}|${email.toLowerCase()}`
        const existing = authorMap.get(key)
        if (existing) {
          existing.commitCount++
        } else {
          authorMap.set(key, { name, email, commitCount: 1 })
        }
      }
    } catch {
      // skip repos that error
    }
  }

  return Array.from(authorMap.values()).sort((a, b) => b.commitCount - a.commitCount)
}
