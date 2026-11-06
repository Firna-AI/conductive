import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_PATHS } from '../../shared/account'
import { boatKeyPath } from '../../shared/api'
import type { FakeApiOptions, FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { blankDraft } from '../state/chat-snapshot'
import { chatFor } from '../state/test-kit'
import { historyEntries } from './ChatOverlays'
import { Composer } from './Composer'
import { SessionChat } from './SessionChat'
import { SessionTabs } from './SessionTabs'

const now = FAKE_TIME + 161_000

/** The text of rendered markup, with each tag as a space. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

async function renderChat(
  options: FakeApiOptions & {
    key?: boolean
    setup?: (server: FakeApiServer) => void
  },
) {
  const chat = chatFor(options)
  if (options.key === false) {
    chat.server.json('GET', boatKeyPath(FAKE_IDS.org), { configured: false })
  }
  options.setup?.(chat.server)
  await chat.controller.start()
  const markup = () =>
    renderToStaticMarkup(
      <SessionChat
        controller={chat.controller}
        mobile={false}
        now={now}
        onAddBoatKey={() => {}}
        onConnectAgent={() => {}}
        snapshot={chat.controller.getSnapshot()}
      />,
    )
  return { chat, markup, text: () => textOf(markup()) }
}

describe('SessionChat', () => {
  it('keeps the stored chat while the sandbox is stopped, with Resume in place of the composer', async () => {
    const { markup, text } = await renderChat({ workspaceState: 'stopped' })
    expect(text()).toContain('The checkout form now suggests addresses.')
    expect(text()).toContain(
      'Sandbox stopped Your files and chat are saved. Resume',
    )
    expect(markup()).not.toContain('placeholder="Message the agent"')
  })

  it('shows the start steps after the stored chat, and a message that waits for the sandbox', async () => {
    const { markup, text } = await renderChat({
      workspaceState: 'starting',
      conversation: 'queued',
    })
    expect(text()).toContain('Sends when the sandbox is ready')
    expect(text()).toContain(
      'Resuming the sandbox › Resuming with your files as you left them 2m 44s',
    )
    expect(markup()).toContain('placeholder="Message the agent"')
  })

  it('shows a failed turn with its cause and Try again, and an archived chat read-only', async () => {
    const ready = await renderChat({ conversation: 'failed' })
    expect(ready.text()).toContain(
      'This turn stopped The agent is busy. Try again. Try again',
    )
    const archived = await renderChat({
      workspaceState: 'archived',
      conversation: 'failed',
    })
    expect(archived.text()).toContain(
      'Its cloud computer is deleted, and the chat is read-only.',
    )
    expect(archived.text()).not.toContain('Try again. Try again')
    expect(archived.markup()).not.toContain('placeholder="Message the agent"')
  })

  it('shows thinking with the time since the turn started, and Stop beside Send', async () => {
    const { chat, markup, text } = await renderChat({ conversation: 'running' })
    chat.emit({
      sessionId: FAKE_IDS.session,
      turnId: 'turn-1',
      type: 'turn.thinking',
    })
    expect(text()).toContain('Thinking 2m 41s')
    expect(text()).toContain('Stop')
    expect(markup()).toContain('placeholder="Steer the agent while it works"')
  })

  it('names a missing key, gives only an admin its action, and keeps Send off', async () => {
    const admin = await renderChat({ key: false })
    admin.chat.controller.setDraft(FAKE_IDS.session, 'Add tests.')
    expect(admin.text()).toContain(
      'Add a key for the cloud computers of Acme Add key',
    )
    expect(admin.markup()).toMatch(/aria-label="Send" aria-disabled="true"/)
    const member = await renderChat({ key: false, role: 'member' })
    expect(member.text()).toContain(
      'The cloud computers of Acme need a key An admin of Acme adds it in the org settings.',
    )
    expect(member.text()).not.toContain('Add key')
  })

  it('names a missing login, also when the account lists no entry for the agent, and keeps Send off', async () => {
    const { account } = coreFixtures()
    const missing = await renderChat({
      setup: (server) =>
        server.json('GET', ACCOUNT_PATHS.account, {
          ...account,
          agentLogins: [],
        }),
    })
    missing.chat.controller.setDraft(FAKE_IDS.session, 'Add tests.')
    expect(missing.text()).toContain(
      'Connect Claude to use Opus 5.5 Connect Claude',
    )
    expect(missing.markup()).toMatch(/aria-label="Send" aria-disabled="true"/)
    const unknown = await renderChat({
      setup: (server) =>
        server.json(
          'GET',
          ACCOUNT_PATHS.account,
          {
            error: {
              code: 'internal_error',
              message: 'The request failed. Try again.',
            },
          },
          500,
        ),
    })
    unknown.chat.controller.setDraft(FAKE_IDS.session, 'Add tests.')
    expect(unknown.text()).not.toContain('Connect Claude')
    expect(unknown.markup()).not.toMatch(
      /aria-label="Send" aria-disabled="true"/,
    )
  })
})

describe('session parts', () => {
  it('lists the closed sessions, the last closed first, with the agent mark and the time', () => {
    const history = [
      {
        id: 'older',
        title: 'Field order',
        closedAt: FAKE_TIME - 3 * 86_400_000,
        agent: 'claude' as const,
      },
      {
        id: 'newer',
        title: 'Postcode rules',
        closedAt: FAKE_TIME - 86_400_000,
        agent: 'codex' as const,
      },
    ].map(({ agent, ...session }) => ({
      ...session,
      workspaceId: 'w',
      createdAt: 0,
      activeTurnId: null,
      choice: { agent, model: 'Model', effort: 'high' as const },
    }))
    const html = renderToStaticMarkup(
      <SessionTabs
        historyEntries={historyEntries(history, FAKE_TIME, () => {})}
        historyOpen
        mobile={false}
        onCancelRename={() => {}}
        onClose={() => {}}
        onNew={() => {}}
        onRename={() => {}}
        onSelect={() => {}}
        onShowHistory={() => {}}
        onStartRename={() => {}}
        readOnly={false}
        renaming={null}
        tabs={[{ id: 'a', title: 'Address autocomplete', selected: true }]}
      />,
    )
    expect(textOf(html)).toContain(
      'CX Postcode rules 1d ago CL Field order 3d ago',
    )
  })

  it('keeps Send off while a file uploads', () => {
    const composer = (attaching: boolean) =>
      renderToStaticMarkup(
        <Composer
          attaching={attaching}
          blocked={false}
          choice={{ agent: 'claude', model: 'Opus 5.5', effort: 'high' }}
          draft={{ ...blankDraft('draft'), text: 'See the screenshot.' }}
          models={[]}
          onAttach={() => {}}
          onChangeText={() => {}}
          onChooseModel={() => {}}
          onRemoveAttachment={() => {}}
          onSend={() => {}}
          onStop={() => {}}
          running={false}
          sending={false}
          stopping={false}
        />,
      )
    expect(composer(true)).toMatch(/aria-label="Send" aria-disabled="true"/)
    expect(composer(false)).not.toMatch(
      /aria-label="Send" aria-disabled="true"/,
    )
  })
})
