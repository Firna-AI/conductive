import type { WorkspaceTab } from '../components/workspace/TabItem'
import { screenshotCopy } from '../fixtures/attachments'
import { branchPictures, contextFiles, splitPath } from '../fixtures/files'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'

/**
 * The tab of an image file that the state opens: a picture of the branch,
 * an image whose bytes the browser cannot draw, or the copy of an attached
 * screenshot. A picture takes the icon that All files gives each other
 * file. A read of the copy names it by its file name, because no list
 * names it.
 */
function pictureTab(state: WorkspaceState): WorkspaceTab | undefined {
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
    default:
      return undefined
  }
}

/**
 * The tab of the HTML report that the state opens, in each of its views.
 * It takes the icon that All files gives a code file, and each view leads
 * to its own screen.
 */
function htmlTab(state: WorkspaceState): WorkspaceTab | undefined {
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
 * The tab of a file that the state opens and that no other part of the row
 * draws: an image file, or the HTML report.
 */
export function pressedFileTab(
  state: WorkspaceState,
): WorkspaceTab | undefined {
  return pictureTab(state) ?? htmlTab(state)
}
