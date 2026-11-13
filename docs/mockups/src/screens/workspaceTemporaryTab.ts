import { nameLabel } from '../../../../src/shared/name-label'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { newSession } from '../fixtures/sessions'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'

/**
 * The tabs of the centre column that a press opens at the end of the row:
 * a Markdown preview, a diff, a picture, an image that the browser cannot
 * draw, the copy of an attached screenshot, and a file whose name the app
 * does not know. The code file stays a kept tab.
 */
const pressedTabs: ReadonlySet<WorkspaceState['tab']> = new Set([
  'markdown',
  'diff',
  'image',
  'image-not-drawn',
  'attachment',
  'unnamed-file',
])

/** The state draws a temporary tab: the file or the diff of its tab. */
export function hasTemporaryTab(state: WorkspaceState): boolean {
  return state.temporary !== 'none' && pressedTabs.has(state.tab)
}

/** The new session that + opened after the file of the temporary tab. */
const laterSession: WorkspaceTab = {
  key: newSession.key,
  kind: 'session',
  title: nameLabel(newSession.title),
  to: paths.sessions,
  selected: false,
}

/**
 * The file that the temporary tab held before the press of the state, which
 * a double-click kept: README.md, or the diff of AddressForm.tsx when the
 * state shows README.md.
 */
function keptTabOf(state: WorkspaceState): WorkspaceTab {
  return state.tab === 'markdown'
    ? {
        key: 'kept-diff',
        kind: 'diff',
        title: 'AddressForm.tsx',
        to: paths.diff,
        selected: false,
      }
    : {
        key: 'kept-readme',
        kind: 'markdown',
        title: 'README.md',
        to: paths.markdown,
        selected: false,
      }
}

/**
 * The row with the temporary tab of the state, from decisions 284 to 287:
 * the shown file or diff, with its title in italics. A replaced file keeps
 * the place of the file before it, so the tab of a session that opened
 * later stays after it. After a keep, the next press opens a new temporary
 * tab at the end of the row, as each new tab opens there.
 */
export function withTemporaryTab(
  state: WorkspaceState,
  tabs: readonly WorkspaceTab[],
): WorkspaceTab[] {
  if (!hasTemporaryTab(state)) return [...tabs]
  const at = tabs.findIndex((tab) => tab.selected && tab.kind !== 'session')
  if (at < 0) return [...tabs]
  const marked = tabs.with(at, { ...tabs[at], temporary: true })
  switch (state.temporary) {
    case 'none':
    case 'opened':
      return marked
    case 'replaced':
      return [...marked, laterSession]
    case 'kept':
      return marked.toSpliced(at, 0, keptTabOf(state))
  }
}
