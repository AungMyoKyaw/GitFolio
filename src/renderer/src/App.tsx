import { useEffect, useRef, useState } from 'react'
import type { AuthorInfo, ProgressEvent, RecentSelection, RepoInfo } from '../../shared/types'

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
  const [recentSelections, setRecentSelections] = useState<RecentSelection[]>([])
  const [exportedRepos, setExportedRepos] = useState(0)
  const [exportedAuthors, setExportedAuthors] = useState(0)
  const [exportedCommits, setExportedCommits] = useState(0)
  const [exportDuration, setExportDuration] = useState<number | null>(null)
  const opStartTime = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => window.api.onProgress(setProgress), [])

  useEffect(() => {
    window.api.getRecentSelections().then(setRecentSelections)
  }, [])

  useEffect(() => {
    if (phase !== 'scanning' && phase !== 'exporting') {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => {
      setElapsed(opStartTime.current ? Date.now() - opStartTime.current : 0)
    }, 500)
    return () => clearInterval(interval)
  }, [phase])

  const handlePickFolder = async (overridePath?: string) => {
    const path = overridePath ?? (await window.api.openFolder())
    if (!path) return

    setError('')
    setProgress(null)
    opStartTime.current = Date.now()
    setPhase('scanning')

    try {
      const foundRepos = await window.api.scanRepos(path)
      setRepos(foundRepos)
      setFolderPath(path)

      const foundAuthors = await window.api.getAuthors(foundRepos.map((repo) => repo.path))
      setAuthors(foundAuthors)

      const recentSels = await window.api.getRecentSelections()
      setRecentSelections(recentSels)
      const match = recentSels.find((item) => item.folderPath === path)
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
    opStartTime.current = Date.now()

    const selected = authors.filter((author) => selectedKeys.has(authorKey(author)))
    setExportedRepos(repos.length)
    setExportedAuthors(selected.length)
    setExportedCommits(selected.reduce((sum, a) => sum + a.commitCount, 0))
    setPhase('exporting')

    try {
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

      setExportDuration(Date.now() - (opStartTime.current ?? Date.now()))
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
    setExportedRepos(0)
    setExportedAuthors(0)
    setExportedCommits(0)
    setExportDuration(null)
    opStartTime.current = null
  }

  const filteredAuthors = authors.filter((author) => {
    const query = search.trim().toLowerCase()
    if (query === '') return true

    return (
      author.name.toLowerCase().includes(query) || author.email.toLowerCase().includes(query)
    )
  })

  const selectedAuthors = authors.filter((author) => selectedKeys.has(authorKey(author)))

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="eyebrow">Desktop contribution exporter</div>
          <div className="brand-row">
            <h1>GitFolio</h1>
          </div>
        </div>
        <nav className="phase-strip" aria-label="Workflow progress">
          {phaseOrder.map((item, index) => {
            const state = getPhaseState(item, phase)
            return (
              <div key={item} className={`phase-item phase-item-${state}`}>
                <span className="phase-index">
                  {state === 'complete' ? '✓' : `0${index + 1}`}
                </span>
                <strong>{phaseMeta[item].title}</strong>
              </div>
            )
          })}
        </nav>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span className="eyebrow">Blocking error</span>
          <p>{error}</p>
        </div>
      )}

      <div className="app-body">
        <ContextPanel
          phase={phase}
          folderPath={folderPath}
          repoCount={repos.length}
          authorCount={authors.length}
          selectedCount={selectedAuthors.length}
          commitCount={selectedAuthors.reduce((sum, a) => sum + a.commitCount, 0)}
          onExport={handleExport}
        />

        <main className="app-main">
          {phase === 'pick-folder' && (
            <FolderPickPhase
              onPick={handlePickFolder}
              recentSelections={recentSelections}
              onPickRecent={(path) => handlePickFolder(path)}
            />
          )}
          {phase === 'scanning' && (
            <OperationPlaceholder
              phaseLabel="Repository discovery"
              title="Scanning for git histories"
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
              onBack={reset}
            />
          )}
          {phase === 'exporting' && (
            <OperationPlaceholder
              phaseLabel="Markdown assembly"
              title="Exporting contribution portfolio"
            />
          )}
          {phase === 'done' && (
            <DonePhase
              outputPath={outputPath}
              exportedRepos={exportedRepos}
              exportedAuthors={exportedAuthors}
              exportedCommits={exportedCommits}
              exportDuration={exportDuration}
              onReset={reset}
            />
          )}
        </main>
      </div>

      {(phase === 'scanning' || phase === 'exporting') && (
        <FooterStatusBar phase={phase} progress={progress} elapsed={elapsed} />
      )}
    </div>
  )
}

interface ContextPanelProps {
  phase: Phase
  folderPath: string
  repoCount: number
  authorCount: number
  selectedCount: number
  commitCount: number
  onExport: () => void
}

function ContextPanel({
  phase,
  folderPath,
  repoCount,
  authorCount,
  selectedCount,
  commitCount,
  onExport
}: ContextPanelProps) {
  const hasData = phase !== 'pick-folder'
  const folderName = folderPath ? folderPath.split('/').pop() || folderPath : null

  return (
    <aside className="context-panel">
      <div className="context-workspace">
        <span className="eyebrow">Workspace</span>
        {folderName ? (
          <div className="context-path" title={folderPath}>
            <strong>{folderName}</strong>
            <code className="context-path-full">{folderPath}</code>
          </div>
        ) : (
          <span className="context-empty">No folder selected</span>
        )}
      </div>

      <div className="context-stats">
        <div className="context-stat">
          <span className="context-stat-label">Repositories</span>
          <strong className="context-stat-value">
            {hasData ? repoCount.toLocaleString() : '—'}
          </strong>
        </div>
        <div className="context-stat">
          <span className="context-stat-label">Authors</span>
          <strong className="context-stat-value">
            {hasData ? authorCount.toLocaleString() : '—'}
          </strong>
        </div>
        <div className={`context-stat${selectedCount > 0 ? ' context-stat-active' : ''}`}>
          <span className="context-stat-label">Selected</span>
          <strong className="context-stat-value">
            {hasData ? selectedCount.toLocaleString() : '—'}
          </strong>
        </div>
        <div className={`context-stat${selectedCount > 0 ? ' context-stat-active' : ''}`}>
          <span className="context-stat-label">Commits</span>
          <strong className="context-stat-value">
            {hasData ? commitCount.toLocaleString() : '—'}
          </strong>
        </div>
      </div>

      {phase === 'pick-authors' && (
        <button
          className="btn-primary context-export-btn"
          onClick={onExport}
          disabled={selectedCount === 0}
        >
          Export Portfolio {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      )}
    </aside>
  )
}

function FolderPickPhase({
  onPick,
  recentSelections,
  onPickRecent
}: {
  onPick: () => void
  recentSelections: RecentSelection[]
  onPickRecent: (path: string) => void
}) {
  const sorted = [...recentSelections].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

  return (
    <section className="phase-screen">
      <div className="hero-card surface-card">
        <div className="hero-copy">
          <span className="eyebrow">Phase 01</span>
          <h2>Point GitFolio at your repository workspace</h2>
          <p>
            Choose a parent folder and GitFolio will recursively detect every `.git` directory,
            merge author identities, and set up the export workflow.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-large" onClick={() => onPick()}>
              Choose Folder
            </button>
          </div>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="recent-workspaces surface-card">
          <span className="eyebrow">Recent Workspaces</span>
          <ul className="recent-list">
            {sorted.map((sel) => {
              const name = sel.folderPath.split('/').pop() || sel.folderPath
              const date = new Date(sel.timestamp).toLocaleDateString()
              return (
                <li
                  key={sel.folderPath}
                  className="recent-item"
                  onClick={() => onPickRecent(sel.folderPath)}
                >
                  <div className="recent-item-info">
                    <strong>{name}</strong>
                    <code>{sel.folderPath}</code>
                  </div>
                  <span className="recent-item-date">{date}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="feature-list surface-card">
          <span className="eyebrow">What GitFolio does</span>
          <ul className="checklist">
            <li>Find all repositories in a workspace folder</li>
            <li>Extract and merge author identities across repos</li>
            <li>Let you select which authors to include</li>
            <li>Generate a single consolidated markdown portfolio</li>
          </ul>
        </div>
      )}
    </section>
  )
}

function OperationPlaceholder({
  phaseLabel,
  title
}: {
  phaseLabel: string
  title: string
}) {
  return (
    <div className="operation-placeholder">
      <div className="pulse-dot" />
      <div>
        <span className="eyebrow">{phaseLabel}</span>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

function FooterStatusBar({
  phase,
  progress,
  elapsed
}: {
  phase: Phase
  progress: ProgressEvent | null
  elapsed: number
}) {
  const current = progress?.current ?? 0
  const total = progress?.total ?? 0
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  const elapsedSec = Math.floor(elapsed / 1000)
  const elapsedStr =
    elapsedSec >= 60
      ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
      : `${elapsedSec}s`

  const etaSec =
    current > 5 && elapsed > 0
      ? Math.round(((elapsed / current) * (total - current)) / 1000)
      : null
  const etaStr =
    etaSec !== null
      ? etaSec >= 60
        ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s`
        : `${etaSec}s`
      : null

  const label = phase === 'scanning' ? 'Scanning repositories' : 'Exporting portfolio'

  return (
    <footer className="app-footer">
      <span className="footer-label eyebrow">{label}</span>
      <div className="footer-progress-track">
        <div className="footer-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="footer-item">{progress?.message ?? '—'}</span>
      <span className="footer-meta">
        {current > 0 && `${current.toLocaleString()} / ${total.toLocaleString()}`}
        {current > 0 && ` · ${pct}%`}
        {elapsedSec > 0 && ` · ${elapsedStr}`}
        {etaStr && ` · ETA ${etaStr}`}
      </span>
    </footer>
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
  onBack
}: AuthorPickPhaseProps) {
  const selectedCount = selectedAuthors.length
  const totalCommits = selectedAuthors.reduce((sum, author) => sum + author.commitCount, 0)

  return (
    <section className="phase-screen">
      <div className="surface-card author-card">
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
                  <th className="numeric-cell">Repos</th>
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
                        {author.repoCount.toLocaleString()}
                      </td>
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
    </section>
  )
}

function DonePhase({
  outputPath,
  exportedRepos,
  exportedAuthors,
  exportedCommits,
  exportDuration,
  onReset
}: {
  outputPath: string
  exportedRepos: number
  exportedAuthors: number
  exportedCommits: number
  exportDuration: number | null
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(outputPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="phase-screen phase-screen-centered">
      <div className="done-card surface-card">
        <div className="done-header">
          <span className="done-check">✓</span>
          <div>
            <span className="eyebrow">Export complete</span>
            <h2>Markdown portfolio generated</h2>
          </div>
        </div>

        <div className="done-stats-grid">
          <StatCard label="Repositories" value={exportedRepos.toLocaleString()} />
          <StatCard label="Authors" value={exportedAuthors.toLocaleString()} accent />
          <StatCard label="Commits" value={exportedCommits.toLocaleString()} />
          <StatCard
            label="Time"
            value={exportDuration !== null ? formatDuration(exportDuration) : '—'}
          />
        </div>

        <div className="path-block">
          <span>Output path</span>
          <code>{outputPath}</code>
        </div>

        <div className="done-actions">
          <button className="btn-secondary" onClick={() => window.api.openFile(outputPath)}>
            Open File
          </button>
          <button className="btn-secondary" onClick={() => window.api.showInFolder(outputPath)}>
            Open Folder
          </button>
          <button className="btn-secondary" onClick={handleCopyPath}>
            {copied ? 'Copied!' : 'Copy Path'}
          </button>
          <button className="btn-primary" onClick={onReset}>
            Start Over
          </button>
        </div>
      </div>
    </section>
  )
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`
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
