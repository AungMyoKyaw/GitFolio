import { useState, useEffect } from 'react'
import type { RepoInfo, AuthorInfo, ProgressEvent } from '../../shared/types'

type Phase = 'pick-folder' | 'scanning' | 'pick-authors' | 'exporting' | 'done'

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

  useEffect(() => {
    return window.api.onProgress(setProgress)
  }, [])

  const handlePickFolder = async () => {
    const path = await window.api.openFolder()
    if (!path) return
    setError('')
    setPhase('scanning')
    try {
      const foundRepos = await window.api.scanRepos(path)
      setRepos(foundRepos)
      setFolderPath(path)
      const foundAuthors = await window.api.getAuthors(foundRepos.map((r) => r.path))
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
    setPhase('exporting')
    try {
      const selected = authors.filter((a) => selectedKeys.has(`${a.name}|${a.email}`))
      await window.api.saveRecentSelection({
        folderPath,
        authorKeys: selected.map((author) => `${author.name}|${author.email}`),
        timestamp: Date.now()
      })
      await window.api.exportContributions({
        repoPaths: repos.map((r) => r.path),
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

  const filteredAuthors = authors.filter(
    (a) =>
      search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 24, gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>GitFolio</h1>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>git contribution exporter</span>
      </header>

      {error && (
        <div
          style={{
            background: '#2d0000',
            border: '1px solid #ef4444',
            borderRadius: 6,
            padding: 12,
            color: '#ef4444',
            fontSize: 13
          }}
        >
          {error}
        </div>
      )}

      {phase === 'pick-folder' && <FolderPickPhase onPick={handlePickFolder} />}

      {phase === 'scanning' && <ProgressPhase progress={progress} label="Scanning repositories…" />}

      {phase === 'pick-authors' && (
        <AuthorPickPhase
          repos={repos}
          authors={filteredAuthors}
          totalAuthors={authors.length}
          selectedKeys={selectedKeys}
          search={search}
          onSearchChange={setSearch}
          onToggle={toggleAuthor}
          onExport={handleExport}
          onBack={reset}
        />
      )}

      {phase === 'exporting' && (
        <ProgressPhase progress={progress} label="Exporting contributions…" />
      )}

      {phase === 'done' && <DonePhase outputPath={outputPath} onReset={reset} />}
    </div>
  )
}

function FolderPickPhase({ onPick }: { onPick: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24
      }}
    >
      <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
        <p style={{ fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>
          Select a folder containing your git repositories
        </p>
        <p style={{ fontSize: 13 }}>GitFolio recursively scans for all .git directories</p>
      </div>
      <button className="btn-primary" style={{ fontSize: 16, padding: '12px 32px' }} onClick={onPick}>
        Choose Folder
      </button>
    </div>
  )
}

function ProgressPhase({ progress, label }: { progress: ProgressEvent | null; label: string }) {
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
      }}
    >
      <p style={{ color: 'var(--text-dim)' }}>{progress?.message ?? label}</p>
      <div
        style={{
          width: 400,
          background: 'var(--bg-2)',
          borderRadius: 8,
          height: 8,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            background: 'var(--accent)',
            height: '100%',
            transition: 'width 0.2s',
            borderRadius: 8
          }}
        />
      </div>
      {progress && (
        <p style={{ color: '#555', fontSize: 12 }}>
          {progress.current} / {progress.total}
        </p>
      )}
    </div>
  )
}

interface AuthorPickPhaseProps {
  repos: RepoInfo[]
  authors: AuthorInfo[]
  totalAuthors: number
  selectedKeys: Set<string>
  search: string
  onSearchChange: (s: string) => void
  onToggle: (key: string) => void
  onExport: () => void
  onBack: () => void
}

function AuthorPickPhase({
  repos,
  authors,
  totalAuthors,
  selectedKeys,
  search,
  onSearchChange,
  onToggle,
  onExport,
  onBack
}: AuthorPickPhaseProps) {
  const selectedCount = selectedKeys.size
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Found <strong style={{ color: 'var(--text)' }}>{repos.length}</strong> repos &amp;{' '}
          <strong style={{ color: 'var(--text)' }}>{totalAuthors}</strong> authors
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="btn-primary" onClick={onExport} disabled={selectedCount === 0}>
            Export{selectedCount > 0 ? ` (${selectedCount} author${selectedCount > 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        autoFocus
      />

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          borderRadius: 8,
          border: '1px solid var(--border)',
          minHeight: 0
        }}
      >
        {authors.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: '#555' }}>No authors found</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={thStyle}></th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Name</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Email</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Commits</th>
              </tr>
            </thead>
            <tbody>
              {authors.map((author) => {
                const key = `${author.name}|${author.email}`
                const isSelected = selectedKeys.has(key)
                return (
                  <tr
                    key={key}
                    onClick={() => onToggle(key)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? '#0f1f0f' : 'transparent',
                      borderBottom: '1px solid #1e1e1e'
                    }}
                  >
                    <td style={{ padding: '10px 12px', width: 40 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', color: isSelected ? 'var(--accent)' : 'var(--text)' }}>
                      {author.name}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12 }}>
                      {author.email}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-dim)' }}>
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
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--text-dim)',
  fontWeight: 500,
  borderBottom: '1px solid var(--border)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

function DonePhase({ outputPath, onReset }: { outputPath: string; onReset: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <p style={{ fontSize: 18, marginBottom: 8 }}>Export complete!</p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, maxWidth: 500, wordBreak: 'break-all' }}>
          {outputPath}
        </p>
      </div>
      <button className="btn-primary" onClick={onReset}>
        Start Over
      </button>
    </div>
  )
}
