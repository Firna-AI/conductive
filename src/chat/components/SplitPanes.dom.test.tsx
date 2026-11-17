// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { controlledUploads } from '../../app/draft-files.test-support'
import { sessionPaths } from '../../shared/sessions'
import {
  byLabel,
  byRole,
  queryAllByRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { draggedFiles, dropOn } from '../../test-support/file-drop'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { rightFile, splitView } from '../state/pane-test-kit'
import {
  fieldOn,
  markOf,
  mountSplit,
  paneOn,
  rowOn,
  tabsOf,
  type Side,
} from './split-test-kit'
import { debounce, pointer } from './tab-drag-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const mouse = { pointerType: 'mouse' }
const sides: readonly Side[] = ['left', 'right']

/** Whether each row holds a control with this name. */
const controlsNamed = (name: string) =>
  sides.map((side) => queryByRole('button', name, rowOn(side)) !== null)

describe('the split column', () => {
  it('draws a row, a chat, and a message field in each pane, and each field sends to the session of its pane', async () => {
    const chat = await mountSplit()
    const rows = {
      left: tabsOf(rowOn('left')),
      right: tabsOf(rowOn('right')),
      plus: controlsNamed('New session'),
      history: controlsNamed('Session history'),
    }
    const path = (id: string) => sessionPaths.messages(org, workspace, id)
    for (const [side, text] of [
      ['left', 'Check the left session'],
      ['right', 'Check the right session'],
    ] as const) {
      await typeText(fieldOn(side), text)
      await press(byRole('button', 'Send', paneOn(side)))
    }
    await waitFor(
      () =>
        [FAKE_IDS.session, 'debounce'].every(
          (id) => chat.draftOf(id)?.sending !== true,
        ),
      'the end of the sends',
    )
    expect(rows).toEqual({
      left: ['[Address autocomplete]'],
      right: [`[${debounce}]`],
      plus: [true, true],
      history: [false, true],
    })
    expect({
      left: await chat.bodies('POST', path(FAKE_IDS.session)),
      right: await chat.bodies('POST', path('debounce')),
    }).toMatchObject({
      left: [{ text: 'Check the left session' }],
      right: [{ text: 'Check the right session' }],
    })
  })

  it('takes a drop of files anywhere on a pane into the message field of that pane', async () => {
    const chat = await mountSplit({ uploads: controlledUploads() })
    const drop = (target: HTMLElement, name: string) =>
      dropOn(target, draggedFiles([new File(['x'], name)]))
    drop(byLabel('Chat', paneOn('left')), 'left.png')
    drop(rowOn('right'), 'right.png')
    const names = (id: string) =>
      chat.draftOf(id)?.files.map((item) => item.file.name) ?? []
    expect({ left: names(FAKE_IDS.session), right: names('debounce') }).toEqual(
      { left: ['left.png'], right: ['right.png'] },
    )
  })

  it('marks the focused pane, and a press, a key, or the keyboard focus in the other pane makes it the focused pane, but the session history keeps it', async () => {
    const chat = await mountSplit()
    const state = () => ({
      marks: [markOf(rowOn('left')), markOf(rowOn('right'))],
      focused: chat.controller.getSnapshot().view?.focusedPane,
    })
    const steps = [state()]
    pointer(byLabel('Chat', paneOn('right')), 'pointerdown', mouse)
    steps.push(state())
    const saved = (await chat.savedView()).focusedPane
    act(() => fieldOn('left').focus())
    steps.push(state())
    // The drop of a tab sets the focus too. The keyboard focus stays in
    // the left field, so a typed letter there makes the left pane focused.
    act(() => chat.controller.focusPane(1))
    const key = new KeyboardEvent('keydown', { key: 'a', bubbles: true })
    act(() => fieldOn('left').dispatchEvent(key))
    steps.push(state())
    pointer(
      byRole('button', 'Session history', rowOn('right')),
      'pointerdown',
      mouse,
    )
    steps.push(state())
    expect(steps).toEqual([
      { marks: ['focused', 'unfocused'], focused: 0 },
      { marks: ['unfocused', 'focused'], focused: 1 },
      { marks: ['focused', 'unfocused'], focused: 0 },
      { marks: ['focused', 'unfocused'], focused: 0 },
      { marks: ['focused', 'unfocused'], focused: 0 },
    ])
    expect(saved).toBe(1)
  })

  it('gives the session keys to the message field of the focused pane', async () => {
    const chat = await mountSplit()
    const focusMessage = () => {
      act(() => chat.offers.run('focus-message'))
      return sides.find((side) => document.activeElement === fieldOn(side))
    }
    const steps = [focusMessage()]
    act(() => chat.controller.focusPane(1))
    steps.push(focusMessage())
    expect(steps).toEqual(['left', 'right'])
  })

  it('leads with the other pane when the focused pane shows a page', async () => {
    const chat = await mountSplit({ pages: [<p key="page">The page</p>, null] })
    act(() => chat.offers.run('focus-message'))
    expect({
      page: queryByRole('textbox', 'Message', paneOn('left')),
      focus: document.activeElement === fieldOn('right'),
    }).toEqual({ page: null, focus: true })
  })

  it('shows one bar of a stopped sandbox below both panes, in place of both message fields', async () => {
    await mountSplit({ workspaceState: 'stopped' })
    expect({
      resume: queryAllByRole('button', 'Resume').length,
      inPanes: sides.map(
        (side) => queryByRole('button', 'Resume', paneOn(side)) !== null,
      ),
      fields: queryAllByRole('textbox', 'Message').length,
    }).toEqual({ resume: 1, inPanes: [false, false], fields: 0 })
  })

  it('shows the saved split of an archived workspace with no + and binds no drag', async () => {
    await mountSplit({ workspaceState: 'archived' })
    const tab = byRole('button', debounce, rowOn('right'))
    pointer(tab, 'pointerdown', { ...mouse, clientX: 10 })
    pointer(window, 'pointermove', { ...mouse, clientX: 90 })
    const status = rowOn('right').querySelector('[role="status"]')
    pointer(window, 'pointerup', { ...mouse, clientX: 90, buttons: 0 })
    expect({
      left: tabsOf(rowOn('left')),
      right: tabsOf(rowOn('right')),
      plus: controlsNamed('New session'),
      drag: status?.textContent,
    }).toEqual({
      left: ['[Address autocomplete]'],
      right: [`[${debounce}]`],
      plus: [false, false],
      drag: '',
    })
  })

  it('hides a pane of an archived workspace that holds only files, and the other pane fills the column with no mark', async () => {
    // The open session without a place joins the end of the focused row.
    const files = {
      tabs: [rightFile],
      activeTab: rightFile,
      temporaryTab: null,
    }
    await mountSplit({
      workspaceState: 'archived',
      view: { ...splitView, panes: [splitView.panes[0], files] },
    })
    const row = queryByLabel('Sessions and files')
    expect({
      panes: [queryByLabel('Left pane'), queryByLabel('Right pane')],
      mark: row && markOf(row),
      tabs: row && tabsOf(row),
    }).toEqual({
      panes: [null, null],
      mark: null,
      tabs: ['[Address autocomplete]', debounce],
    })
  })
})
