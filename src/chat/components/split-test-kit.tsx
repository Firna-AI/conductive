import type { ReactNode } from 'react'
import { onTestFinished } from 'vitest'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { PaneSplit } from '../../app/pane-split'
import { MemoryStorage } from '../../app/test-kit'
import type { WorkspaceView } from '../../shared/workspace-view'
import {
  ShortcutContext,
  type ShortcutLayer,
} from '../../shell/shortcuts/shortcut-context'
import { ShortcutOffers } from '../../shell/shortcuts/shortcut-offers'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { asMessageField } from '../../test-support/message-field'
import { holdAnimationFrames, mount } from '../../test-support/mount'
import { paneChat, setSplitView, splitView } from '../state/pane-test-kit'
import { WorkspaceChatView } from '../WorkspaceChat'

// Mounts the chat of a workspace whose saved view holds two panes, as the
// app keeps it, for the tests of the split column.

/** A side of the split, by the name of its pane. */
export type Side = 'left' | 'right'

const paneLabels = { left: 'Left pane', right: 'Right pane' } as const

/** The pane of a side. */
export const paneOn = (side: Side) => byLabel(paneLabels[side])

/** The tab row of the pane of a side. */
export const rowOn = (side: Side) =>
  byLabel(`Sessions and files of the ${side} pane`)

/** The message field of the pane of a side. */
export const fieldOn = (side: Side) =>
  asMessageField(byRole('textbox', 'Message', paneOn(side)))

/** The mark of the focus that a row draws, if any. */
export function markOf(row: HTMLElement): 'focused' | 'unfocused' | null {
  if (row.classList.contains(styles.focused)) return 'focused'
  if (row.classList.contains(styles.unfocused)) return 'unfocused'
  return null
}

/** The names of the tabs of a row, with the current one in brackets. */
export function tabsOf(row: HTMLElement): string[] {
  return Array.from(row.querySelectorAll('li'), (item) => {
    if (item.getAttribute('aria-hidden') === 'true') return '|'
    const name = item.querySelector('button')?.textContent ?? ''
    return item.querySelector('[aria-current="page"]') ? `[${name}]` : name
  })
}

/**
 * The chat of the fake workspace, loaded with `view` as its saved view, on
 * the screen of `viewport`. The shortcut layer of the test takes the keys
 * that the chat offers. `storage` keeps the share of the left pane.
 */
export async function mountSplit(
  options: Parameters<typeof paneChat>[0] & {
    view?: WorkspaceView
    viewport?: 'desktop' | 'mobile'
    storage?: MemoryStorage
    /** The page of the host in each pane, as a file page of the app. */
    pages?: readonly ReactNode[]
  } = {},
) {
  holdAnimationFrames()
  const {
    view = splitView,
    viewport = 'desktop',
    pages,
    storage = new MemoryStorage(),
    ...chatOptions
  } = options
  const chat = paneChat(chatOptions)
  setSplitView(chat, view)
  await chat.controller.start()
  onTestFinished(chat.controller.stop)
  const offers = new ShortcutOffers()
  const layer: ShortcutLayer = {
    offers,
    terminals: new Set(),
    recorders: new Set(),
    keymap: new Map(),
  }
  const split = new PaneSplit(storage)
  const mounted = await mount(
    <ShortcutContext value={layer}>
      <WorkspaceChatView
        clock={{ now: () => FAKE_TIME }}
        controller={chat.controller}
        pages={pages}
        paneSplit={split}
        viewport={viewport}
      />
    </ShortcutContext>,
  )
  return { ...chat, offers, split, storage, root: mounted.container }
}
