import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import { scanRepos } from './git/scanner'
import { getAuthors } from './git/authors'
import { exportContributions } from './git/exporter'
import { PrefsStore } from './prefs'
import type { ExportOptions, RecentSelection } from '../shared/types'

export function registerIpcHandlers(win: BrowserWindow): void {
  const prefs = new PrefsStore(app.getPath('userData'))

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:saveFile', async () => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `contribution-report-${new Date().toISOString().split('T')[0]}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('git:scanRepos', async (_, folderPath: string) => {
    return scanRepos(folderPath)
  })

  ipcMain.handle('git:getAuthors', async (_, repoPaths: string[]) => {
    return getAuthors(repoPaths, (progress) => {
      win.webContents.send('progress', progress)
    })
  })

  ipcMain.handle('git:exportContributions', async (_, options: ExportOptions) => {
    return exportContributions(options, (progress) => {
      win.webContents.send('progress', progress)
    })
  })

  ipcMain.handle('prefs:getRecentSelections', () => {
    return prefs.getRecentSelections()
  })

  ipcMain.handle('prefs:saveRecentSelection', (_, selection: RecentSelection) => {
    prefs.saveRecentSelection(selection)
  })
}
