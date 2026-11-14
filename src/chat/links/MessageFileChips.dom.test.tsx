// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/agents'
import type { FileEntry } from '../../shared/files'
import type { UserMessage } from '../../shared/messages'
import { accessibleName } from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import { mount, press } from '../../test-support/mount'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { UserBubble } from '../components/TranscriptItem'
import { Copying, copyAll } from './mention-copy-test-kit'
import { LinksProvider } from './LinksContext'

const entries: FileEntry[] = [
  { path: 'src/lib', name: 'lib', kind: 'directory', change: null },
  { path: 'README.md', name: 'README.md', kind: 'file', change: null },
]

const opus: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
  fast: false,
}

/** A sent message of a member with `text`. */
function sent(id: string, text: string): UserMessage {
  return {
    id,
    sessionId: FAKE_IDS.session,
    sender: senderSnapshot(fakeUser),
    text,
    attachments: [],
    choice: opus,
    createdAt: FAKE_TIME,
    state: 'sent',
  }
}

/**
 * Mounts sent messages as the chat draws them. With `workspaceFiles`, the
 * chat has the tree of its workspace, as a chat that is not archived.
 */
async function mountText(text: string | string[], workspaceFiles: boolean) {
  const opened: string[] = []
  const shown: string[] = []
  const snapshot = {
    tree: { entries: new Map(entries.map((item) => [item.path, item])) },
    treeError: null,
    treeUnavailable: false,
  }
  const value: ChatMentions = {
    files: { subscribe: () => () => undefined, getSnapshot: () => snapshot },
    openFile: (path) => opened.push(path),
    showFolder: (path) => shown.push(path),
    href: (item) => `/files/${item.path}`,
  }
  const texts = Array.isArray(text) ? text : [text]
  const { container } = await mount(
    <LinksProvider value={{ links: { orgId: FAKE_IDS.org, workspaces: [] } }}>
      <MentionsProvider value={workspaceFiles ? value : null}>
        <Copying>
          {texts.map((item, index) => (
            <UserBubble key={item} message={sent(`message-${index}`, item)} />
          ))}
        </Copying>
      </MentionsProvider>
    </LinksProvider>,
  )
  return { container, opened, shown }
}

/** The index of a node among the children of its parent. */
function indexOf(node: Node): number {
  return Array.prototype.indexOf.call(node.parentNode?.childNodes ?? [], node)
}

describe('file chips in a sent message', () => {
  test('each chip is a link to its page, and a plain click opens the file or shows the folder', async () => {
    const view = await mountText('Move @README.md into @src/lib/ now', true)
    const links = [...view.container.querySelectorAll('a')]
    for (const link of links) await press(link)
    expect({
      names: links.map((link) => accessibleName(link)),
      hrefs: links.map((link) => link.getAttribute('href')),
      titles: links.map((link) => link.getAttribute('title')),
      opened: view.opened,
      shown: view.shown,
    }).toEqual({
      names: ['File README.md', 'Folder lib'],
      hrefs: ['/files/README.md', '/files/src/lib'],
      titles: ['README.md', 'src/lib/'],
      opened: ['README.md'],
      shown: ['src/lib'],
    })
  })

  test('a copy across two messages stays with the browser, and each file chip shows its mention for it', async () => {
    const view = await mountText(
      ['Move @README.md into @src/lib/ now', 'Then read @README.md'],
      true,
    )
    expect(copyAll(view.container)).toEqual({
      copying: true,
      native: true,
      text: 'Move @README.md into @src/lib/ now\nThen read @README.md',
    })
  })

  test('a copy without a file chip changes nothing', async () => {
    const view = await mountText('Moved @README.md', false)
    expect(copyAll(view.container)).toEqual({
      copying: false,
      native: true,
      text: 'Moved @README.md',
    })
  })

  test('a selection that starts or ends inside a chip takes the whole chip', async () => {
    const view = await mountText('Move @README.md into @src/lib/ now', true)
    const [first, second] = view.container.querySelectorAll('a')
    const range = document.createRange()
    range.setStart(first.querySelector('span span')?.firstChild ?? first, 0)
    range.setEnd(second.lastChild ?? second, 0)
    document.getSelection()?.removeAllRanges()
    document.getSelection()?.addRange(range)
    document.dispatchEvent(
      new ClipboardEvent('copy', { bubbles: true, cancelable: true }),
    )
    const held = document.getSelection()?.getRangeAt(0)
    expect({
      start: [held?.startContainer, held?.startOffset],
      end: [held?.endContainer, held?.endOffset],
    }).toEqual({
      start: [first.parentNode, indexOf(first)],
      end: [second.parentNode, indexOf(second) + 1],
    })
  })

  test('a chat without the files of its workspace shows each mention as text', async () => {
    const view = await mountText('Moved @README.md', false)
    expect({
      links: view.container.querySelectorAll('a').length,
      text: view.container.textContent,
    }).toEqual({ links: 0, text: 'Moved @README.md' })
  })
})
