import type { FileTabView } from '../components/files/FilesPanel'
import type { BackLink } from '../components/layout/Page'
import { paths } from '../paths'
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
    case 'html':
    case 'html-source':
    case 'html-opening':
    case 'html-older-software':
    case 'html-failed':
      return { label: 'All files', to: paths.filesAll }
  }
}
