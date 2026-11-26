// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import a11y from '../../ui/components/common/a11y.module.css'
import type { FileEntry } from '../../shared/generated/FileEntry'
import { accessibleName } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import { chatFiles } from '../chat-files-test-kit'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { FakeSkills } from '../mentions/skills-test-kit'
import { AgentText } from './AgentText'
import { MessageLine } from './MessageLine'

// An image with no alt text shows the name of its file while the tree holds
// the file, and else no words. These tests change the tree under a message
// that stays the same.

/** A file whose image stays a link, as the image of an SVG file does. */
const flow: FileEntry = {
  path: 'docs/flow.svg',
  name: 'flow.svg',
  kind: 'file',
  change: null,
}

/** The files of a chat, with the real file store of `chatFiles`. */
function mentionsOf(files: ChatMentions['files']): ChatMentions {
  return {
    files,
    skills: new FakeSkills({ claude: [], codex: [] }),
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (entry) => `/files/${entry.path}`,
  }
}

it('draws the heading of an image with no alt text only while the tree holds its file, and keeps the paragraphs around it apart', async () => {
  const tree = await chatFiles([])
  const view = await mount(
    <MentionsProvider value={mentionsOf(tree.files)}>
      <AgentText
        id="agent:1"
        text={['Before.', '## ![](docs/flow.svg)', 'After.'].join('\n')}
      />
    </MentionsProvider>,
  )
  const drawn = () => ({
    headings: Array.from(
      view.container.querySelectorAll('h1, h2, h3, h4, h5, h6'),
      (heading) => `${heading.tagName} ${accessibleName(heading)}`,
    ),
    paragraphs: Array.from(
      view.container.querySelectorAll('p'),
      (paragraph) => paragraph.textContent,
    ),
  })
  const before = drawn()
  await tree.changeTree([{ operation: 'upsert', entry: flow }])
  const added = drawn()
  await tree.changeTree([{ operation: 'remove', path: flow.path }])
  const paragraphs = ['Before.', 'After.']
  expect({ before, added, removed: drawn() }).toEqual({
    before: { headings: [], paragraphs },
    added: { headings: ['H2 flow.svg'], paragraphs },
    removed: { headings: [], paragraphs },
  })
})

it('names an open message line by the file of an image with no alt text before its table while the tree holds the file, and else by the hidden copy of its closed text', async () => {
  const tree = await chatFiles([])
  const table = ['| Workers | Time |', '| ---: | ---: |', '| 4 | 3m 10s |']
  // Each lead opens in a line of its own, so each case fails on its own.
  const leads = {
    image: ['![](docs/flow.svg)'],
    imageHeading: ['## ![](docs/flow.svg)'],
  }
  const lines: [string, HTMLElement][] = []
  for (const [lead, text] of Object.entries(leads)) {
    const view = await mount(
      <MentionsProvider value={mentionsOf(tree.files)}>
        <MessageLine id="agent:1" text={[...text, ...table].join('\n')} />
      </MentionsProvider>,
    )
    const line = view.container.querySelector('summary')
    if (!line) throw new Error('The message has no line')
    await press(line)
    lines.push([lead, line])
  }
  const names = () =>
    Object.fromEntries(
      lines.map(([lead, line]) => [
        lead,
        {
          name: accessibleName(line),
          copies: line.querySelectorAll(`.${a11y.hidden}`).length,
        },
      ]),
    )
  const before = names()
  await tree.changeTree([{ operation: 'upsert', entry: flow }])
  const added = names()
  await tree.changeTree([{ operation: 'remove', path: flow.path }])
  const hidden = { name: 'Workers · Time · 4 · 3m 10s', copies: 1 }
  const file = { name: 'flow.svg', copies: 0 }
  expect({ before, added, removed: names() }).toEqual({
    before: { image: hidden, imageHeading: hidden },
    added: { image: file, imageHeading: file },
    removed: { image: hidden, imageHeading: hidden },
  })
})
