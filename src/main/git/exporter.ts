import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import type { AuthorInfo, ExportOptions, ProgressEvent } from '../../shared/types'
import { generateMarkdown } from '../markdown'

type ProgressCallback = (event: ProgressEvent) => void

const LOCKFILE_RE =
  /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Podfile\.lock|composer\.lock|Gemfile\.lock|Cargo\.lock)$/i
const BINARY_EXT_RE =
  /\.(png|jpg|jpeg|gif|ico|bmp|webp|svg|pdf|zip|tar|gz|bz2|7z|woff|woff2|ttf|eot|mp4|mp3|mov|avi|dmg|exe|dll|so|dylib|bin|dat|db|sqlite)$/i
const MAX_DIFF_LINES = 200
const SMALL_COMMIT_THRESHOLD = 50

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

export async function exportContributions(
  options: ExportOptions,
  onProgress: ProgressCallback
): Promise<void> {
  const { repoPaths, authors, outputPath } = options
  const selectedEmails = new Set(authors.map((author) => author.email.toLowerCase()))
  const allContributions: RepoContributions[] = []

  let totalCommits = 0
  let dateMin = ''
  let dateMax = ''

  for (let i = 0; i < repoPaths.length; i++) {
    const repoPath = repoPaths[i]
    const repoName = repoPath.split('/').pop() ?? repoPath

    onProgress({
      phase: 'exporting',
      current: i + 1,
      total: repoPaths.length,
      message: `Exporting from ${repoName}…`
    })

    try {
      const logOutput = execSync(
        'git log --all --format="%H|%an|%ae|%ad|%s" --date=short',
        { cwd: repoPath, timeout: 60000, maxBuffer: 100 * 1024 * 1024 }
      ).toString()

      const commits: CommitRecord[] = []

      for (const line of logOutput.split('\n')) {
        const trimmed = line.trim().replace(/^"|"$/g, '')
        if (!trimmed) continue
        const parts = trimmed.split('|')
        if (parts.length < 5) continue
        const [hash, _authorName, authorEmail, date, ...messageParts] = parts
        const message = messageParts.join('|')
        if (!selectedEmails.has(authorEmail.toLowerCase())) continue

        if (!dateMin || date < dateMin) dateMin = date
        if (!dateMax || date > dateMax) dateMax = date

        const diff = extractDiff(repoPath, hash)
        commits.push({ hash: hash.slice(0, 7), date, message, diff })
        totalCommits++
      }

      if (commits.length > 0) {
        allContributions.push({ repoName, commits })
      }
    } catch {
      // skip repos that error
    }
  }

  const markdown = generateMarkdown({
    authors,
    contributions: allContributions,
    totalRepos: allContributions.length,
    totalCommits,
    dateRange: { min: dateMin, max: dateMax }
  })

  writeFileSync(outputPath, markdown, 'utf8')
}

function extractDiff(repoPath: string, hash: string): string {
  try {
    const raw = execSync(`git show ${hash} --patch --no-color`, {
      cwd: repoPath,
      timeout: 30000,
      maxBuffer: 50 * 1024 * 1024
    }).toString()

    const fileSections = splitByFile(raw)
    const totalChanged = fileSections.reduce((sum, s) => sum + s.lines.length, 0)

    if (totalChanged <= SMALL_COMMIT_THRESHOLD) {
      return fileSections.map(({ filename, lines }) => formatFileDiff(filename, lines)).join('\n\n')
    }

    const sorted = [...fileSections].sort((a, b) => b.lines.length - a.lines.length)
    const significant = sorted.slice(0, 3)
    const rest = sorted.slice(3)
    const parts = significant.map(({ filename, lines }) => formatFileDiff(filename, lines))
    if (rest.length > 0) {
      parts.push(`\n_…and ${rest.length} more file(s) not shown (large commit)_`)
    }
    return parts.join('\n\n')
  } catch {
    return ''
  }
}

interface FileSectionRaw {
  filename: string
  lines: string[]
}

function splitByFile(raw: string): FileSectionRaw[] {
  const sections: FileSectionRaw[] = []
  let current: FileSectionRaw | null = null

  for (const line of raw.split('\n')) {
    if (line.startsWith('diff --git ')) {
      if (current) sections.push(current)
      const match = line.match(/b\/(.+)$/)
      current = { filename: match ? match[1] : line, lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)

  return sections.filter((s) => {
    const base = s.filename.split('/').pop() ?? s.filename
    return !LOCKFILE_RE.test(base) && !BINARY_EXT_RE.test(s.filename)
  })
}

function formatFileDiff(filename: string, lines: string[]): string {
  const diffLines = lines.filter(
    (l) => l.startsWith('+') || l.startsWith('-') || l.startsWith(' ') || l.startsWith('@@')
  )

  let output = diffLines
  let truncated = false
  if (output.length > MAX_DIFF_LINES) {
    output = output.slice(0, MAX_DIFF_LINES)
    truncated = true
  }

  const body = output.join('\n') + (truncated ? '\n<!-- ... truncated ... -->' : '')
  return `#### \`${filename}\`\n\`\`\`diff\n${body}\n\`\`\``
}
