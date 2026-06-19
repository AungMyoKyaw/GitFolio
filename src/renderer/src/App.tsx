import { useEffect, useState } from 'react'
import type { AuthorInfo, ProgressEvent, RepoInfo } from '../../shared/types'

type Phase = 'pick-folder' | 'scanning' | 'pick-authors' | 'exporting' | 'done'

const phaseOrder: Phase[] = ['pick-folder', 'scanning', 'pick-authors', 'exporting', 'done']

const phaseMeta: Record<Phase, { step: string; title: string; detail: string }> = {
  'pick-folder': {
    step: '01',
    title: 'Pick Folder',
    detail: 'Point GitFolio at the workspace that contains your cloned repositories.'
  },
  scanning: {
    step: '02',
    title: 'Scan Repositories',
    detail: 'Recursively detect git history and prepare the author index.'
  },
  'pick-authors': {
    step: '03',
    title: 'Select Authors',
    detail: 'Filter, review, and choose the identities you want in the export.'
  },
  exporting: {
    step: '04',
    title: 'Export Markdown',
    detail: 'Build one markdown file with all matching contributions.'
  },
  done: {
    step: '05',
    title: 'Complete',
    detail: 'Export finished. Review the output path and start another pass if needed.'
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('pick-folder')
  const [folderPath, setFolderPath] = useState('')
  const [repos, setRepos] = useState<RepoInfo[]>([])
  const [authors, setAuthors] = useState<AuthorInfo[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [outputPath, setOutputPath] = useState('')
  const [error, setError] = useState('')

  useEffect(() => window.api.onProgress(setProgress), [])

  const handlePickFolder = async () => {
    const path = await window.api.openFolder()
    if (!path) return

    setError('')
    setProgress(null)
    setPhase('scanning')

    try {
      const foundRepos = await window.api.scanRepos(path)
      setRepos(foundRepos)
      setFolderPath(path)

      const foundAuthors = await window.api.getAuthors(foundRepos.map((repo) => repo.path))
      setAuthors(foundAuthors)

      const recentSelections = await window.api.getRecentSelections()
      const match = recentSelections.find((item) => item.folderPath === path)
      setSelectedKeys(new Set(match?.authorKeys ?? []))
      setPhase('pick-authors')
    } catch (e) {
      setError(String(e))
      setPhase('pick-folder')
    }
  }

  const toggleAuthor = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleExport = async () => {
    const savePath = await window.api.saveFile()
    if (!savePath) return

    setError('')
    setProgress(null)
    setPhase('exporting')

    try {
      const selected = authors.filter((author) => selectedKeys.has(authorKey(author)))

      await window.api.saveRecentSelection({
        folderPath,
        authorKeys: selected.map(authorKey),
        timestamp: Date.now()
      })

      await window.api.exportContributions({
        repoPaths: repos.map((repo) => repo.path),
        authors: selected,
        outputPath: savePath
      })

      setOutputPath(savePath)
      setPhase('done')
    } catch (e) {
      setError(String(e))
      setPhase('pick-authors')
    }
  }

  const reset = () => {
    setPhase('pick-folder')
    setFolderPath('')
    setRepos([])
    setAuthors([])
    setSelectedKeys(new Set())
    setSearch('')
    setProgress(null)
    setOutputPath('')
    setError('')
  }

  const filteredAuthors = authors.filter((author) => {
    const query = search.trim().toLowerCase()
    if (query === '') return true

    return (
      author.name.toLowerCase().includes(query) || author.email.toLowerCase().includes(query)
    )
  })

  const selectedAuthors = authors.filter((author) => selectedKeys.has(authorKey(author)))
  const currentMeta = phaseMeta[phase]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">Desktop contribution exporter</div>
          <div className="brand-row">
            <h1>GitFolio</h1>
          </div>
          <p className="app-subtitle">
            Scan repositories, isolate author identities, and export a markdown portfolio without
            leaving your local machine.
          </p>
        </div>
        <div className="header-phase-card">
          <div className="phase-chip phase-chip-active">Step {currentMeta.step}</div>
          <strong>{currentMeta.title}</strong>
          <span>{currentMeta.detail}</span>
        </div>
      </header>

      <nav className="phase-strip" aria-label="Workflow progress">
        {phaseOrder.map((item, index) => {
          const state = getPhaseState(item, phase)
          return (
            <div key={item} className={`phase-item phase-item-${state}`}>
              <span className="phase-index">0{index + 1}</span>
              <strong>{phaseMeta[item].title}</strong>
            </div>
          )
        })}
      </nav>

      {error && (
        <div className="error-banner" role="alert">
          <span className="eyebrow">Blocking error</span>
          <p>{error}</p>
        </div>
      )}

      <main className="app-main">
        {phase === 'pick-folder' && <FolderPickPhase onPick={handlePickFolder} />}
        {phase === 'scanning' && (
          <ProgressPhase
            progress={progress}
            phaseLabel="Repository discovery"
            title="Scanning for git histories"
            detail="GitFolio is walking the selected folder and indexing each repository before author extraction begins."
          />
        )}
        {phase === 'pick-authors' && (
          <AuthorPickPhase
            folderPath={folderPath}
            repos={repos}
            authors={filteredAuthors}
            totalAuthors={authors.length}
            selectedAuthors={selectedAuthors}
            selectedKeys={selectedKeys}
            search={search}
            onSearchChange={setSearch}
            onToggle={toggleAuthor}
            onExport={handleExport}
            onBack={reset}
          />
        )}
        {phase === 'exporting' && (
          <ProgressPhase
            progress={progress}
            phaseLabel="Markdown assembly"
            title="Exporting contribution portfolio"
            detail="GitFolio is collecting commit metadata and diffs into one final markdown document."
          />
        )}
        {phase === 'done' && <DonePhase outputPath={outputPath} onReset={reset} />}
      </main>
    </div>
  )
}

function FolderPickPhase({ onPick }: { onPick: () => void }) {
  return (
    <section className="phase-screen phase-screen-centered">
      <div className="hero-card surface-card">
        <div className="hero-copy">
          <span className="eyebrow">Phase 01</span>
          <h2>Point GitFolio at your repository workspace</h2>
          <p>
            Choose a parent folder and GitFolio will recursively detect every `.git` directory,
            merge author identities, and set up the export workflow.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-large" onClick={onPick}>
              Choose Folder
            </button>
            <div className="hint-block">
              <strong>Expected flow</strong>
              <span>{'Pick folder -> scan repos -> select authors -> export markdown'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProgressPhase({
  progress,
  phaseLabel,
  title,
  detail
}: {
  progress: ProgressEvent | null
  phaseLabel: string
  title: string
  detail: string
}) {
  const current = progress?.current ?? 0
  const total = progress?.total ?? 0
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <section className="phase-screen phase-screen-centered">
      <div className="progress-card surface-card">
        <span className="eyebrow">{phaseLabel}</span>
        <h2>{title}</h2>
        <p>{detail}</p>

        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="progress-meta-row">
          <strong>{progress?.message ?? 'Working...'}</strong>
          <span>{pct}%</span>
        </div>

        <div className="progress-stats-grid">
          <StatCard label="Processed" value={String(current)} />
          <StatCard label="Total" value={String(total)} />
          <StatCard label="Phase" value={progress?.phase ?? 'pending'} />
        </div>
      </div>
    </section>
  )
}

interface AuthorPickPhaseProps {
  folderPath: string
  repos: RepoInfo[]
  authors: AuthorInfo[]
  totalAuthors: number
  selectedAuthors: AuthorInfo[]
  selectedKeys: Set<string>
  search: string
  onSearchChange: (value: string) => void
  onToggle: (key: string) => void
  onExport: () => void
  onBack: () => void
}

function AuthorPickPhase({
  folderPath,
  repos,
  authors,
  totalAuthors,
  selectedAuthors,
  selectedKeys,
  search,
  onSearchChange,
  onToggle,
  onExport,
  onBack
}: AuthorPickPhaseProps) {
  const selectedCount = selectedAuthors.length
  const totalCommits = selectedAuthors.reduce((sum, author) => sum + author.commitCount, 0)

  return (
    <section className="phase-screen phase-screen-fill">
      <div className="author-layout">
        <div className="surface-card summary-card">
          <span className="eyebrow">Selection scope</span>
          <h2>Review authors before export</h2>
          <p>
            Filter identities, keep the ones you want to attribute, then export one consolidated
            markdown file.
          </p>

          <div className="stats-grid">
            <StatCard label="Selected" value={String(selectedCount)} accent />
            <StatCard label="Authors" value={String(totalAuthors)} />
            <StatCard label="Commits" value={totalCommits.toLocaleString()} />
            <StatCard label="Repositories" value={String(repos.length)} />
          </div>

        </div>

        <div className="surface-card table-card">
          <div className="table-command-bar">
            <div className="table-command-copy">
              <span className="eyebrow">Author index</span>
              <strong>{authors.length === totalAuthors ? 'All discovered authors' : 'Filtered authors'}</strong>
              <span className="table-command-meta">
                {selectedCount === 0
                  ? 'Choose at least one author to enable export.'
                  : `${selectedCount} authors selected · ${totalCommits.toLocaleString()} commits ready`}
              </span>
            </div>

            <div className="table-command-controls">
              <label className="table-context-row" aria-label="Selected folder">
                <span className="table-context-label">Folder</span>
                <code>{folderPath}</code>
              </label>

              <div className="search-wrap">
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="action-row table-action-row">
                <button className="btn-secondary" onClick={onBack}>
                  Back
                </button>
                <button className="btn-primary" onClick={onExport} disabled={selectedCount === 0}>
                  Export {selectedCount > 0 ? `(${selectedCount})` : ''}
                </button>
              </div>
            </div>
          </div>

          <div className="table-frame">
            {authors.length === 0 ? (
              <div className="empty-state">
                <strong>No authors found</strong>
                <span>Try a different search or rescan another folder.</span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th aria-label="selected" />
                    <th>Name</th>
                    <th>Email</th>
                    <th className="numeric-cell">Commits</th>
                  </tr>
                </thead>
                <tbody>
                  {authors.map((author) => {
                    const key = authorKey(author)
                    const isSelected = selectedKeys.has(key)

                    return (
                      <tr
                        key={key}
                        className={isSelected ? 'table-row-selected' : undefined}
                        onClick={() => onToggle(key)}
                      >
                        <td className="checkbox-cell">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggle(key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <div className="author-name-cell">
                            <strong>{author.name}</strong>
                          </div>
                        </td>
                        <td className="muted-cell">{author.email}</td>
                        <td className="numeric-cell muted-cell">
                          {author.commitCount.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function DonePhase({ outputPath, onReset }: { outputPath: string; onReset: () => void }) {
  return (
    <section className="phase-screen phase-screen-centered">
      <div className="done-card surface-card">
        <span className="eyebrow">Export complete</span>
        <h2>Markdown portfolio generated</h2>
        <p>
          GitFolio finished exporting the selected contribution history. The resulting markdown file
          is ready at the path below.
        </p>

        <div className="path-block">
          <span>Output path</span>
          <code>{outputPath}</code>
        </div>

        <div className="action-row action-row-centered">
          <button className="btn-primary" onClick={onReset}>
            Start Over
          </button>
        </div>
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  accent = false
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={`stat-card${accent ? ' stat-card-accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function getPhaseState(target: Phase, current: Phase) {
  const targetIndex = phaseOrder.indexOf(target)
  const currentIndex = phaseOrder.indexOf(current)

  if (targetIndex < currentIndex) return 'complete'
  if (targetIndex === currentIndex) return 'active'
  return 'upcoming'
}

function authorKey(author: AuthorInfo) {
  return `${author.name}|${author.email}`
}
