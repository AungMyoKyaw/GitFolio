import { describe, expect, it } from 'vitest'

import { generateMarkdown } from '@main/markdown'

describe('generateMarkdown', () => {
  it('renders the summary header and repo sections', () => {
    const markdown = generateMarkdown({
      authors: [{ name: 'Alice', email: 'alice@example.com', commitCount: 2, repoCount: 1 }],
      contributions: [
        {
          repoName: 'app',
          commits: [
            {
              hash: 'abc1234',
              date: '2024-01-10',
              message: 'feat: add stuff',
              diff: '#### `src/a.ts`\n```diff\n+one\n```'
            }
          ]
        }
      ],
      totalRepos: 1,
      totalCommits: 1,
      dateRange: { min: '2024-01-10', max: '2024-01-10' }
    })

    expect(markdown).toContain('# Contribution Report: Alice')
    expect(markdown).toContain('**Total Repos:** 1')
    expect(markdown).toContain('## Repo: app')
    expect(markdown).toContain('### 2024-01-10 — abc1234')
  })
})
