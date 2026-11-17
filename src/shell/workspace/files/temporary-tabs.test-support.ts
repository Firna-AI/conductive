import { act } from 'react'
import type { FilesTab } from '../../../files/navigation'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { byLabel } from '../../../test-support/dom-queries'
import type { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { linkTo } from '../wiring-test-kit'
import { filesHref } from './files-address'

const { org, workspace: id } = FAKE_IDS

/** The views that the tab saved, from the request with index `from` on. */
export function savedViews(
  server: FakeApiServer,
  from: number,
): Promise<unknown[]> {
  return bodiesOf(server, 'PUT', workspaceViewPath(org, id), from)
}

/** The temporary mark of a saved view, or "none" for a body without one. */
export function markOf(body: unknown): unknown {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('panes' in body) ||
    !Array.isArray(body.panes)
  )
    return 'none'
  const pane: unknown = body.panes[0]
  return typeof pane === 'object' && pane !== null && 'temporaryTab' in pane
    ? pane.temporaryTab
    : 'none'
}

/** The link of All files or Changes, in the right column, to `tab`. */
export function rowLink(view: HTMLElement, list: string, tab: FilesTab) {
  const panel = byLabel('Files and tools', view)
  return linkTo(byLabel(list, panel), filesHref(org, id, tab))
}

/**
 * A double-click of the mouse, as a browser sends it: a press and a click
 * with the count 1, a press and a click with the count 2, then the
 * double-click. The page settles after the first click, as it does between
 * two clicks. The result says, for each press, whether the page stopped
 * the action of the browser, which selects a word at the second press.
 */
export async function doubleClick(target: HTMLElement): Promise<boolean[]> {
  const send = (type: string, detail: number) => {
    const init = { bubbles: true, cancelable: true, button: 0, detail }
    const event = new MouseEvent(type, init)
    act(() => {
      target.dispatchEvent(event)
    })
    return event.defaultPrevented
  }
  const stopped: boolean[] = []
  for (const detail of [1, 2]) {
    stopped.push(send('mousedown', detail))
    send('mouseup', detail)
    send('click', detail)
    if (detail === 1) await settle()
  }
  send('dblclick', 2)
  await settle()
  return stopped
}
