import { contextBridge, ipcRenderer } from 'electron'
import type { ExportOptions, ProgressEvent, RecentSelection } from '../shared/types'

const api = {
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  saveFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:saveFile'),
  scanRepos: (folderPath: string) => ipcRenderer.invoke('git:scanRepos', folderPath),
  getAuthors: (repoPaths: string[]) => ipcRenderer.invoke('git:getAuthors', repoPaths),
  exportContributions: (options: ExportOptions) =>
    ipcRenderer.invoke('git:exportContributions', options),
  getRecentSelections: (): Promise<RecentSelection[]> =>
    ipcRenderer.invoke('prefs:getRecentSelections'),
  saveRecentSelection: (selection: RecentSelection): Promise<void> =>
    ipcRenderer.invoke('prefs:saveRecentSelection', selection),
  openFile: (path: string): Promise<void> =>
    ipcRenderer.invoke('shell:openFile', path),
  showInFolder: (path: string): Promise<void> =>
    ipcRenderer.invoke('shell:showInFolder', path),
  onProgress: (callback: (event: ProgressEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: ProgressEvent) => callback(event)
    ipcRenderer.on('progress', handler)
    return () => ipcRenderer.removeListener('progress', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
