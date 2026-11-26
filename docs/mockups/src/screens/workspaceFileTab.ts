import type { FileTabView } from '../components/files/FilesPanel'
import type { BackLink } from '../components/layout/Page'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { answerShot } from '../fixtures/answerFiles'
import { screenshotCopy } from '../fixtures/attachments'
import { branchPictures, contextFiles, splitPath } from '../fixtures/files'
import { detectedServers, openPort, openPorts } from '../fixtures/previews'
import { paths } from '../paths'
import { previewTabLabel } from '../../../../src/ui/components/tools/previewCopy'
import type { WorkspaceState } from './workspaceState'

/**
 * The file that the centre tab shows, when the tab is a file. With masked
 * paths, a diff opens the masked seed script.
 */
export function openFile(state: WorkspaceState): FileTabView | undefined {
  switch (state.tab) {
    case 'code':
    case 'code-lines':
    case 'markdown':
      return state.tab
    case 'diff':
      return state.paths === 'masked' ? 'masked-diff' : 'diff'
    case 'unnamed-file':
      return 'unnamed'
    case 'image':
    case 'image-not-drawn':
    case 'attachment':
    case 'screenshot':
    case 'html':
    case 'html-source':
    case 'html-opening':
    case 'html-older-software':
    case 'html-failed':
      return state.tab
    case 'session':
    case 'new-session':
    case 'linked-session':
    case 'later-session':
    case 'started-session':
    case 'preview':
    case 'preview-behind':
    case 'explanation':
      return undefined
  }
}

/** The way back from a file page on a phone: to its list. */
export function backFrom(open: FileTabView): BackLink {
  switch (open) {
    case 'diff':
      return { label: 'Changes', to: paths.filesChanges }
    case 'masked-diff':
      return { label: 'Changes', to: paths.maskedPathsChanges }
    case 'unnamed':
      return { label: 'All files', to: paths.maskedPathsAllFiles }
    case 'code':
    case 'code-lines':
    case 'markdown':
    case 'image':
    case 'image-not-drawn':
    case 'attachment':
    case 'screenshot':
    case 'html':
    case 'html-source':
    case 'html-opening':
    case 'html-older-software':
    case 'html-failed':
      return { label: 'All files', to: paths.filesAll }
  }
}

/**
 * The tab of the HTML report that the state opens, in each of its views.
 * It takes the icon that All files gives a code file, and each view leads
 * to its own screen.
 */
export function htmlTab(state: WorkspaceState): WorkspaceTab | undefined {
  const tab = (to: string): WorkspaceTab => ({
    key: 'report',
    kind: 'code',
    title: splitPath(contextFiles.report).name,
    to,
    selected: true,
  })
  switch (state.tab) {
    case 'html':
      return tab(paths.html)
    case 'html-source':
      return tab(paths.htmlSource)
    case 'html-opening':
      return tab(paths.htmlOpening)
    case 'html-older-software':
      return tab(paths.htmlOlderSoftware)
    case 'html-failed':
      return tab(paths.htmlFailed)
    default:
      return undefined
  }
}

/**
 * The tab of an image file that the state opens: a picture of the branch,
 * an image whose bytes the browser cannot draw, the copy of an attached
 * screenshot, or the screenshot of the agent. A picture takes the icon that
 * All files gives each other file. A read of the copy names it by its file
 * name, because no list names it.
 */
export function pictureTab(state: WorkspaceState): WorkspaceTab | undefined {
  const tab = (key: string, path: string, to: string): WorkspaceTab => ({
    key,
    kind: 'file',
    title: splitPath(path).name,
    to,
    selected: true,
  })
  switch (state.tab) {
    case 'image':
      return tab('image', branchPictures.picture, paths.image)
    case 'image-not-drawn':
      return tab('image', branchPictures.damaged, paths.imageNotDrawn)
    case 'attachment':
      return tab('copy', screenshotCopy.path, paths.attachmentOpen)
    case 'screenshot':
      return tab('screenshot', answerShot, paths.imageFromAnswer)
    default:
      return undefined
  }
}

/**
 * The Preview tabs of the row, while the state keeps them (decision 291):
 * one tab for each port, ports 3000 and 6006, opened after the code file.
 * Each shows the label of its port, as the list of the tool names it. The
 * tab of port 3000 shows in `preview`.
 */
export function previewTabs(state: WorkspaceState): WorkspaceTab[] {
  if (state.tab !== 'preview' && state.tab !== 'preview-behind') return []
  return openPorts.map((port) => {
    const server = detectedServers.find((each) => each.port === port)
    return {
      key: `preview:${port}`,
      kind: 'preview',
      title: previewTabLabel(port, server),
      to: paths.preview,
      selected: state.tab === 'preview' && port === openPort,
    }
  })
}
