// @vitest-environment happy-dom
import { act } from 'react'
import { expect, it, vi } from 'vitest'
import { routes } from '../../app/router'
import type { FileEntry } from '../../shared/generated/FileEntry'
import type { Workspace } from '../../shared/generated/Workspace'
import {
  LinkOpeningProvider,
  type LinkOpening,
} from '../../shell/ui/text-links'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { mount } from '../../test-support/mount'
import { LinksProvider, type ChatLinks } from '../links/LinksContext'
import { answerParts } from '../markdown/answer-parts'
import {
  MentionsProvider,
  type ChatMentions,
} from '../mentions/MentionsContext'
import { FakeSkills } from '../mentions/skills-test-kit'
import { AgentText } from './AgentText'

// Each block that draws reads its parts once, so the calls count the
// blocks that draw.
vi.mock('../markdown/answer-parts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../markdown/answer-parts')>()
  return { ...real, answerParts: vi.fn(real.answerParts) }
})

const entry: FileEntry = {
  path: 'src/app.ts',
  name: 'app.ts',
  kind: 'file',
  change: null,
}

/** A tree of files that starts empty, and gains `entry` when it grows. */
function filesOf() {
  const listeners = new Set<() => void>()
  let snapshot = {
    tree: { entries: new Map<string, FileEntry>() },
    treeError: null,
    treeUnavailable: false,
  }
  const mentions: ChatMentions = {
    files: {
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      getSnapshot: () => snapshot,
    },
    skills: new FakeSkills({ claude: [], codex: [] }),
    openFile: () => undefined,
    showFolder: () => undefined,
    href: (item) => `/files/${item.path}`,
  }
  const grow = () => {
    snapshot = {
      ...snapshot,
      tree: { entries: new Map([[entry.path, entry]]) },
    }
    for (const listener of listeners) listener()
  }
  return { mentions, grow }
}

/** The opening of the links of a workspace screen, with or without servers. */
function openingOf(servers: boolean): LinkOpening {
  const ports = { href: (port: number) => `/preview/${port}`, open: () => {} }
  return {
    appOrigin: FAKE_ORIGIN,
    isAppPage: () => false,
    ports: servers ? ports : null,
  }
}

it('draws again only the blocks whose text changed while the agent writes, and the chips and links of each other block still follow the workspaces, the tree, and the links of the screen', async () => {
  const linked = workspaceFixtures().workspaces.workspaces[0] as Workspace
  const linksOf = (workspaces: Workspace[] | null): ChatLinks => ({
    links: { orgId: FAKE_IDS.org, workspaces },
  })
  const files = filesOf()
  const steps = Array.from({ length: 6 }, (_, index) => `Step ${index + 1}.`)
  const text = [
    `Compare ${linked.link} first.`,
    'Open http://localhost:3000 to see it.',
    'Read @src/app.ts next.',
    ...steps,
  ].join('\n\n')
  const answer = (links: ChatLinks, opening: LinkOpening, more: string) => (
    <LinkOpeningProvider value={opening}>
      <LinksProvider value={links}>
        <MentionsProvider root={null} value={files.mentions}>
          <AgentText id="agent:1" live text={`${text}${more}`} />
        </MentionsProvider>
      </LinksProvider>
    </LinkOpeningProvider>
  )
  const [links, opening] = [linksOf(null), openingOf(true)]
  const view = await mount(answer(links, opening, ''))
  vi.mocked(answerParts).mockClear()
  await view.rerender(answer(links, opening, ' Then push.'))
  const drawn = vi.mocked(answerParts).mock.calls.length
  await view.rerender(
    answer(linksOf([linked]), openingOf(false), ' Then push.'),
  )
  await act(async () => files.grow())
  const [chip, local, mention] = Array.from(
    view.container.querySelectorAll('p'),
    (paragraph) =>
      Array.from(paragraph.querySelectorAll('a'), (link) =>
        link.getAttribute('href'),
      ),
  )
  expect({
    drawn,
    last: view.container.querySelector('p:last-of-type')?.textContent,
    chip,
    local,
    mention,
  }).toEqual({
    drawn: 1,
    last: 'Step 6. Then push.',
    chip: [routes.workspace(FAKE_IDS.org, linked.id)],
    local: [],
    mention: ['/files/src/app.ts'],
  })
})
