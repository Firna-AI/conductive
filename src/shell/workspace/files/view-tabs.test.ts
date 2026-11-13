import { describe, expect, test } from 'vitest'
import type { FilesTab } from '../../../files/navigation'
import type {
  TemporaryTab,
  WorkspaceTab,
  WorkspaceView,
} from '../../../shared/workspace-view'
import { withActiveTab, withKeptTab, withoutTab } from './view-tabs'

const first: WorkspaceTab = { kind: 'session', sessionId: 'session-1' }
const second: WorkspaceTab = { kind: 'session', sessionId: 'session-2' }
const readme: FilesTab = { kind: 'file', path: 'README.md', mode: 'preview' }
const readmeSource: FilesTab = { ...readme, mode: 'source' }
const form: FilesTab = {
  kind: 'file',
  path: 'src/app/checkout/AddressForm.tsx',
  mode: 'preview',
}
const hookDiff: FilesTab = {
  kind: 'diff',
  path: 'src/app/checkout/useAddressAutocomplete.ts',
}

function viewOf(
  tabs: readonly WorkspaceTab[],
  activeTab: WorkspaceTab | null,
  temporaryTab: TemporaryTab | null,
): WorkspaceView {
  return { tabs, activeTab, temporaryTab, fileList: 'all', tool: 'terminal' }
}

describe('the temporary tab of the saved view', () => {
  test('a press on a file with no tab opens it at the end of the row as the temporary tab, and shows it', () => {
    const view = viewOf([first, second], first, null)

    expect(withActiveTab(view, readme)).toEqual(
      viewOf([first, second, readme], readme, {
        kind: 'file',
        path: 'README.md',
      }),
    )
  })

  test('a press on a file or a diff with no tab replaces the temporary tab in its place', () => {
    const view = viewOf([first, readme, second], second, {
      kind: 'file',
      path: 'README.md',
    })

    expect(withActiveTab(view, hookDiff)).toEqual(
      viewOf([first, hookDiff, second], hookDiff, {
        kind: 'diff',
        path: 'src/app/checkout/useAddressAutocomplete.ts',
      }),
    )
  })

  test('a press on a file that has a tab shows it, a switch of mode keeps the tab in its place, and neither changes the mark', () => {
    const mark: TemporaryTab = { kind: 'file', path: 'README.md' }
    const view = viewOf([first, form, readme], first, mark)

    expect({
      kept: withActiveTab(view, form),
      switched: withActiveTab(view, readmeSource),
    }).toEqual({
      kept: viewOf([first, form, readme], form, mark),
      switched: viewOf([first, form, readmeSource], readmeSource, mark),
    })
  })

  test('the address of a tab that a press already showed leaves the view as the same object', () => {
    const view = viewOf([first, readme], readme, {
      kind: 'file',
      path: 'README.md',
    })

    expect(withActiveTab(view, readme)).toBe(view)
  })

  test('a mark that names no open tab gives way to a new temporary tab at the end of the row', () => {
    const view = viewOf([first, form], form, { kind: 'file', path: 'gone.md' })

    expect(withActiveTab(view, readme)).toEqual(
      viewOf([first, form, readme], readme, {
        kind: 'file',
        path: 'README.md',
      }),
    )
  })

  test('a keep clears the mark of its own tab in either mode, and leaves each other view as the same object', () => {
    const view = viewOf([first, readmeSource, form], readmeSource, {
      kind: 'file',
      path: 'README.md',
    })
    const diffOfReadme: FilesTab = { kind: 'diff', path: 'README.md' }

    expect({
      kept: withKeptTab(view, readme),
      other: withKeptTab(view, form) === view,
      diff: withKeptTab(view, diffOfReadme) === view,
    }).toEqual({
      kept: viewOf([first, readmeSource, form], readmeSource, null),
      other: true,
      diff: true,
    })
  })

  test('the close of the temporary tab clears the mark, and the close of another tab keeps it', () => {
    const mark: TemporaryTab = { kind: 'file', path: 'README.md' }
    const view = viewOf([first, form, readme], readme, mark)

    expect({
      temporary: withoutTab(view, readme, form),
      other: withoutTab(view, form, null),
    }).toEqual({
      temporary: viewOf([first, form], form, null),
      other: viewOf([first, readme], readme, mark),
    })
  })
})
