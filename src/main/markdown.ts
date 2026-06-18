import type { AuthorInfo } from '../shared/types'

interface CommitRecord {
  hash: string
  date: string
  message: string
  diff: string
}

interface RepoContributions {
  repoName: string
  commits: CommitRecord[]
}

interface MarkdownOptions {
  authors: AuthorInfo[]
  contributions: RepoContributions[]
  totalRepos: number
  totalCommits: number
  dateRange: { min: string; max: string }
}

export function generateMarkdown(opts: MarkdownOptions): string {
  const { authors, contributions, totalRepos, totalCommits, dateRange } = opts
  const authorNames = Array.from(new Set(authors.map((a) => a.name))).join(', ')

  const lines: string[] = [
    `# Contribution Report: ${authorNames}`,
    '',
    `- **Total Repos:** ${totalRepos}`,
    `- **Total Commits:** ${totalCommits.toLocaleString()}`,
    `- **Date Range:** ${dateRange.min} → ${dateRange.max}`,
    '',
    '---',
    ''
  ]

  for (const { repoName, commits } of contributions) {
    lines.push(`## Repo: ${repoName}`, '')

    for (const commit of commits) {
      lines.push(`### ${commit.date} — ${commit.hash}`)
      lines.push(`**${commit.message}**`, '')
      if (commit.diff) {
        lines.push(commit.diff, '')
      }
    }

    lines.push('---', '')
  }

  return lines.join('\n')
}
