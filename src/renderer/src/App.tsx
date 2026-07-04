import { Fragment, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
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

  const refreshRecentSelections = async () => {
    setRecentSelections(await window.api.getRecentSelections())
  }

  const handleRemoveRecent = async (folderPath: string) => {
    await window.api.removeRecentSelection(folderPath)
    await refreshRecentSelections()
  }

  const handleClearRecent = async () => {
    await window.api.clearRecentSelections()
    await refreshRecentSelections()
  }

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
    setExpandedGroups(new Set())
    setProgress(null)
    setOutputPath('')
    setError('')
    setExportedRepos(0)
    setExportedAuthors(0)
    setExportedCommits(0)
    setExportDuration(null)
    opStartTime.current = null
    refreshRecentSelections()
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
              onRemoveRecent={handleRemoveRecent}
              onClearRecent={handleClearRecent}
            />
          )}
          {phase === 'scanning' && (
            <OperationPlaceholder
              phaseLabel="Repository discovery"
              title="Scanning for git histories"
              currentLabel="Current repository"
              currentValue={getOperationTarget(progress, 'scanning')}
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
              expandedGroups={expandedGroups}
              onSearchChange={setSearch}
              onToggle={toggleAuthor}
              onToggleGroup={(group) => toggleAuthorGroup(group, setSelectedKeys)}
              onToggleExpand={(groupKey) => toggleGroupExpanded(groupKey, setExpandedGroups)}
              onBack={reset}
            />
          )}
          {phase === 'exporting' && (
            <OperationPlaceholder
              phaseLabel="Markdown assembly"
              title="Exporting contribution portfolio"
              currentLabel="Current repository"
              currentValue={getOperationTarget(progress, 'exporting')}
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
  onPickRecent,
  onRemoveRecent,
  onClearRecent
}: {
  onPick: () => void
  recentSelections: RecentSelection[]
  onPickRecent: (path: string) => void
  onRemoveRecent: (path: string) => void
  onClearRecent: () => void
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
          <div className="recent-header">
            <span className="eyebrow">Recent Workspaces</span>
            <button
              className="recent-clear"
              onClick={() => {
                if (confirm('Clear all recent workspaces?')) {
                  onClearRecent()
                }
              }}
            >
              Clear all
            </button>
          </div>
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
                  <div className="recent-item-actions">
                    <span className="recent-item-date">{date}</span>
                    <button
                      className="recent-item-remove"
                      type="button"
                      title={`Remove ${name}`}
                      aria-label={`Remove ${name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveRecent(sel.folderPath)
                      }}
                    >
                      ✕
                    </button>
                  </div>
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
  title,
  currentLabel,
  currentValue
}: {
  phaseLabel: string
  title: string
  currentLabel: string
  currentValue: string
}) {
  return (
    <div className="operation-placeholder">
      <div className="pulse-dot" />
      <div>
        <span className="eyebrow">{phaseLabel}</span>
        <h2>{title}</h2>
      </div>
      <div className="operation-current-card surface-card">
        <span className="operation-current-label">{currentLabel}</span>
        <strong className="operation-current-value">{currentValue}</strong>
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
  expandedGroups: Set<string>
  onSearchChange: (value: string) => void
  onToggle: (key: string) => void
  onToggleGroup: (group: DisplayAuthorGroup) => void
  onToggleExpand: (groupKey: string) => void
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
  expandedGroups,
  onSearchChange,
  onToggle,
  onToggleGroup,
  onToggleExpand,
  onBack
}: AuthorPickPhaseProps) {
  const selectedCount = selectedAuthors.length
  const totalCommits = selectedAuthors.reduce((sum, author) => sum + author.commitCount, 0)
  const authorGroups = groupAuthors(authors, selectedKeys)
  const groupLabel = authorGroups.length === totalAuthors ? 'All discovered authors' : 'Filtered authors'

  return (
    <section className="phase-screen">
      <div className="surface-card author-card">
        <div className="table-command-bar">
          <div className="table-command-copy">
            <span className="eyebrow">Author index</span>
            <strong>{groupLabel}</strong>
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
                  <th>Identity</th>
                  <th className="numeric-cell">Repos</th>
                  <th className="numeric-cell">Commits</th>
                </tr>
              </thead>
              <tbody>
                {authorGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.key)

                  return (
                    <Fragment key={group.key}>
                      <tr
                        className={`author-group-row${group.selectedCount > 0 ? ' table-row-selected' : ''}`}
                        onClick={() => onToggleGroup(group)}
                      >
                        <td className="checkbox-cell">
                          <input
                            type="checkbox"
                            checked={group.selectedCount === group.identities.length}
                            onChange={() => onToggleGroup(group)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <div className="author-name-cell author-group-cell">
                            {group.identities.length > 1 ? (
                              <button
                                className="tree-toggle"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleExpand(group.key)
                                }}
                              >
                                {isExpanded ? '▾' : '▸'}
                              </button>
                            ) : (
                              <span className="tree-toggle-placeholder" />
                            )}
                            <div>
                              <strong>{group.name}</strong>
                              <span className="author-group-meta">
                                {group.identities.length > 1
                                  ? `${group.identities.length} identities`
                                  : '1 identity'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="muted-cell">{group.summary}</td>
                        <td className="numeric-cell muted-cell">{group.repoCount.toLocaleString()}</td>
                        <td className="numeric-cell muted-cell">{group.commitCount.toLocaleString()}</td>
                      </tr>

                      {isExpanded && group.identities.length > 1 && (
                        <tr className="identity-row">
                          <td />
                          <td colSpan={4}>
                            <div className="identity-list">
                              {group.identities.map((author) => {
                                const key = authorKey(author)
                                const isSelected = selectedKeys.has(key)

                                return (
                                  <label key={key} className="identity-item">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => onToggle(key)}
                                    />
                                    <span>{author.email}</span>
                                    <span className="identity-item-meta">
                                      {author.repoCount.toLocaleString()} repos ·{' '}
                                      {author.commitCount.toLocaleString()} commits
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
    <section className="phase-screen phase-screen-done">
      <div className="done-card surface-card">
        <div className="done-header">
          <span className="done-check">✓</span>
          <div>
            <p className="done-lede">Export complete</p>
            <h2>Markdown portfolio generated</h2>
            <p className="done-summary">
              Processed {exportedRepos.toLocaleString()} repositories across{' '}
              {exportedAuthors.toLocaleString()} authors and assembled{' '}
              {exportedCommits.toLocaleString()} commits into one markdown portfolio.
            </p>
          </div>
        </div>

        <div className="done-stats-grid">
          <StatCard
            label={formatCountLabel(exportedRepos, 'Repository', 'Repositories')}
            value={exportedRepos.toLocaleString()}
          />
          <StatCard
            label={formatCountLabel(exportedAuthors, 'Author', 'Authors')}
            value={exportedAuthors.toLocaleString()}
            accent
          />
          <StatCard
            label={formatCountLabel(exportedCommits, 'Commit', 'Commits')}
            value={exportedCommits.toLocaleString()}
          />
          <StatCard
            label={exportDuration !== null && exportDuration < 1000 ? 'Generated' : 'Duration'}
            value={exportDuration !== null ? formatDoneDuration(exportDuration) : '—'}
          />
        </div>

        <div className="path-block">
          <span>Output path</span>
          <code>{outputPath}</code>
        </div>

        <div className="done-actions">
          <button className="btn-primary" onClick={() => window.api.openFile(outputPath)}>
            Open File
          </button>
          <button className="btn-secondary" onClick={() => window.api.showInFolder(outputPath)}>
            Open Folder
          </button>
          <button className="btn-secondary" onClick={handleCopyPath}>
            {copied ? 'Copied!' : 'Copy Path'}
          </button>
          <button className="btn-secondary" onClick={onReset}>
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

function formatDoneDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  if (sec <= 0) return 'Instantly'
  if (sec === 1) return '1 Second'
  if (sec < 60) return `${sec} Seconds`

  const min = Math.floor(sec / 60)
  const rem = sec % 60
  if (rem === 0) return `${min} ${min === 1 ? 'Minute' : 'Minutes'}`
  return `${min}m ${rem}s`
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
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

interface DisplayAuthorGroup {
  key: string
  name: string
  identities: AuthorInfo[]
  commitCount: number
  repoCount: number
  selectedCount: number
  summary: string
}

function groupAuthors(authors: AuthorInfo[], selectedKeys: Set<string>): DisplayAuthorGroup[] {
  const groups = new Map<string, DisplayAuthorGroup>()

  for (const author of authors) {
    const key = author.name.trim().toLowerCase()
    const existing = groups.get(key)
    if (existing) {
      existing.identities.push(author)
      existing.commitCount += author.commitCount
      existing.repoCount += author.repoCount
      if (selectedKeys.has(authorKey(author))) existing.selectedCount += 1
    } else {
      groups.set(key, {
        key,
        name: author.name,
        identities: [author],
        commitCount: author.commitCount,
        repoCount: author.repoCount,
        selectedCount: selectedKeys.has(authorKey(author)) ? 1 : 0,
        summary: author.email
      })
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      identities: [...group.identities].sort((a, b) => b.commitCount - a.commitCount),
      summary:
        group.identities.length > 1
          ? `${group.identities[0].email} +${group.identities.length - 1} more`
          : group.identities[0].email
    }))
    .sort((a, b) => b.commitCount - a.commitCount)
}

function toggleAuthorGroup(
  group: DisplayAuthorGroup,
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>
) {
  setSelectedKeys((prev) => {
    const next = new Set(prev)
    const keys = group.identities.map(authorKey)
    const allSelected = keys.every((key) => next.has(key))

    for (const key of keys) {
      if (allSelected) next.delete(key)
      else next.add(key)
    }

    return next
  })
}

function toggleGroupExpanded(
  groupKey: string,
  setExpandedGroups: Dispatch<SetStateAction<Set<string>>>
) {
  setExpandedGroups((prev) => {
    const next = new Set(prev)
    if (next.has(groupKey)) next.delete(groupKey)
    else next.add(groupKey)
    return next
  })
}

function getOperationTarget(progress: ProgressEvent | null, phase: Phase): string {
  const message = progress?.message?.trim()
  if (!message) {
    return phase === 'scanning' ? 'Preparing workspace...' : 'Preparing export...'
  }

  const scanMatch = message.match(/Scanning authors in (.+)$/)
  if (scanMatch) return scanMatch[1]

  const exportMatch = message.match(/Exporting from (.+?)(?:\u2026)?$/)
  if (exportMatch) return exportMatch[1]

  return message
}
