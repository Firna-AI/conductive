import { nameLabel } from '../../../../src/shared/name-label'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { newSession } from '../fixtures/sessions'
import { paths } from '../paths'
import { skillPaths } from '../skillPaths'
import { keptSkillTab } from './workspaceSkillTab'
import type { WorkspaceState } from './workspaceState'

/**
 * The tabs of the centre column that a press opens at the end of the row:
 * a Markdown preview, a diff, a picture, an image that the browser cannot
 * draw, the copy of an attached screenshot, the screenshot of the agent, a
 * file whose name the app does not know, the HTML report in each of its
 * views, and the skill tab in each of its views (skill tab decision 2 A).
 * The code file stays a kept tab.
 */
const pressedTabs: ReadonlySet<WorkspaceState['tab']> = new Set([
  'markdown',
  'diff',
  'image',
  'image-not-drawn',
  'attachment',
  'screenshot',
  'unnamed-file',
  'html',
  'html-source',
  'html-opening',
  'html-older-software',
  'html-failed',
  'skill',
  'skill-source',
  'skill-loading',
  'skill-gone',
  'skill-too-large',
  'skill-older-software',
  'skill-failed',
])

/** The state draws a temporary tab: the file, diff, or skill of its tab. */
function hasTemporaryTab(state: WorkspaceState): boolean {
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
 * README.md in the temporary tab after the kept skill tab of `plans`,
 * while the skill shows. It leads back to the row where README.md shows.
 */
const readmeAfterSkill: WorkspaceTab = {
  key: 'readme',
  kind: 'markdown',
  title: 'README.md',
  to: skillPaths.keptThenFile,
  selected: false,
  temporary: true,
}

/**
 * The screen that README.md leads to from its tab and from its row in All
 * files, while the row keeps the skill tab of `plans` and README.md is the
 * temporary tab after it: that row with README.md shown. A press on a file
 * that has a tab shows that tab, so the skill stays kept. Other rows give
 * none, and README.md leads to its own screen.
 */
export function readmeBesideKeptSkill(
  state: WorkspaceState,
): string | undefined {
  const keptSkill =
    state.temporary === 'skill-kept' || state.temporary === 'skill-shown'
  return keptSkill && hasTemporaryTab(state)
    ? skillPaths.keptThenFile
    : undefined
}

/**
 * The row with the temporary tab of the state, from decisions 284 to 287:
 * the shown file, diff, or skill, with its title in italics. A replaced
 * tab keeps the place of the tab before it, so the tab of a session that
 * opened later stays after it. After a keep, the next press opens a new
 * temporary tab at the end of the row, as each new tab opens there. The
 * kept tab can be a file or the skill tab of `plans`. A return to that
 * kept skill tab shows it, and README.md stays the temporary tab after it.
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
    case 'skill-kept':
      return marked.toSpliced(at, 0, keptSkillTab)
    case 'skill-shown':
      return tabs
        .with(at, { ...tabs[at], to: keptSkillTab.to })
        .toSpliced(at + 1, 0, readmeAfterSkill)
  }
}
