// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { FileEntry } from '../../shared/files'
import { lineLabel, type LineRange } from '../../shared/line-target'
import { accessibleName } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { mount, press } from '../../test-support/mount'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { AnswerText } from './LinkedText'
import { Copying, copyAll } from './mention-copy-test-kit'
import { LinksProvider } from './LinksContext'

const root = '/home/user/code/checkout'

const entries: FileEntry[] = [
  { path: 'src/app.ts', name: 'app.ts', kind: 'file', change: null },
  { path: 'shots/after.png', name: 'after.png', kind: 'file', change: null },
]

async function mountAnswer(text: string, folder: string | null = root) {
  const opened: string[] = []
  const snapshot = {
    tree: { entries: new Map(entries.map((item) => [item.path, item])) },
    treeError: null,
    treeUnavailable: false,
  }
  const at = (lines?: LineRange) => (lines ? `?line=${lineLabel(lines)}` : '')
  const value: ChatMentions = {
    files: { subscribe: () => () => undefined, getSnapshot: () => snapshot },
    openFile: (path, lines) => opened.push(`${path}${at(lines)}`),
    showFolder: () => undefined,
    href: (item, lines) => `/files/${item.path}${at(lines)}`,
  }
  const { container } = await mount(
    <LinksProvider value={{ links: { orgId: FAKE_IDS.org, workspaces: [] } }}>
      <MentionsProvider root={folder} value={value}>
        <Copying>
          <p>
            <AnswerText text={text} />
          </p>
        </Copying>
      </MentionsProvider>
    </LinksProvider>,
  )
  return { container, opened }
}

describe('file chips in an answer', () => {
  test('a mention and a path in code are chips, and a chip with lines opens them', async () => {
    const view = await mountAnswer(
      `See @src/app.ts:42 and \`${root}/shots/after.png\`, not \`npm test\`.`,
    )
    const links = [...view.container.querySelectorAll('a')]
    for (const link of links) await press(link)
    expect({
      names: links.map((link) => accessibleName(link)),
      hrefs: links.map((link) => link.getAttribute('href')),
      titles: links.map((link) => link.getAttribute('title')),
      opened: view.opened,
      code: [...view.container.querySelectorAll('code')].map(
        (code) => code.textContent,
      ),
    }).toEqual({
      names: ['File app.ts:42', 'File after.png'],
      hrefs: ['/files/src/app.ts?line=42', '/files/shots/after.png'],
      titles: ['src/app.ts:42', 'shots/after.png'],
      opened: ['src/app.ts?line=42', 'shots/after.png'],
      code: ['npm test'],
    })
  })

  test('a copy gives the text of the answer', async () => {
    const view = await mountAnswer(
      `See @src/app.ts. Saved \`${root}/shots/after.png\`.`,
    )
    expect(copyAll(view.container)).toEqual({
      copying: true,
      native: true,
      text: `See @src/app.ts. Saved ${root}/shots/after.png.`,
    })
  })

  test('without the folder, an absolute path stays code', async () => {
    const view = await mountAnswer(`Saved \`${root}/shots/after.png\``, null)
    expect({
      links: view.container.querySelectorAll('a').length,
      code: view.container.querySelector('code')?.textContent,
    }).toEqual({ links: 0, code: `${root}/shots/after.png` })
  })
})
