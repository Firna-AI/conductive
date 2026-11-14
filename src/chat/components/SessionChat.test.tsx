import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../app/api/client'
import { uploadingFile, type DraftFile } from '../../app/draft-files'
import { fileMark } from '../../app/draft-marks'
import { ACCOUNT_PATHS } from '../../shared/account'
import { sessionPaths } from '../../shared/sessions'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import { blankDraft } from '../state/chat-snapshot'
import { loginGone, withSessions } from '../state/linked-kit'
import { historyEntries } from './ChatOverlays'
import { Composer } from './Composer'
import { renderChat, textOf } from './render-kit'
import { SessionTabs } from './SessionTabs'

describe('SessionChat', () => {
  it('keeps the stored chat in each sandbox state: Resume while stopped, and the composer while the workspace needs input', async () => {
    const { markup, text } = await renderChat({ workspaceState: 'stopped' })
    expect(text()).toContain('The checkout form now suggests addresses.')
    expect(text()).toContain(
      'Sandbox stopped Your files and chat are saved. Resume',
    )
    expect(markup()).not.toContain('placeholder="Message the agent"')
    const input = await renderChat({ workspaceState: 'input' })
    expect(input.text()).toContain('The checkout form now suggests addresses.')
    expect(input.markup()).toContain('placeholder="Message the agent"')
    input.chat.controller.setDraft(FAKE_IDS.session, 'Use the saved address.')
    await input.chat.controller.send(FAKE_IDS.session)
    const messages = sessionPaths.messages(
      FAKE_IDS.org,
      FAKE_IDS.workspace,
      FAKE_IDS.session,
    )
    expect(await input.chat.bodies('POST', messages)).toMatchObject([
      { text: 'Use the saved address.' },
    ])
  })

  it('shows the start steps after the stored chat, and a message that waits for the sandbox', async () => {
    const { message } = workspaceFixtures()
    const { markup, text } = await renderChat({
      workspaceState: 'starting',
      conversation: 'queued',
    })
    expect(text()).toContain(message.text)
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
    chat.controller.setDraft(FAKE_IDS.session, 'Use the saved address.')
    expect(markup()).toContain('placeholder="Steer the agent while it works"')
    expect(text()).not.toContain('The agent reads this at its next step.')
  })

  it('names a missing login, also when the account lists no entry for the agent, and keeps Send off', async () => {
    const { account } = coreFixtures()
    // The reader started these sessions, so their records say the same.
    const missing = await renderChat({
      setup: (server) => {
        server.json('GET', ACCOUNT_PATHS.account, {
          ...account,
          agentLogins: [],
        })
        withSessions(server, loginGone)
      },
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
      activeTurnStartedAt: null,
      retryMessageId: null,
      startedBy: senderSnapshot(fakeUser),
      sourceSessionId: null,
      loginAvailable: true,
      loginShared: true,
      choice: { agent, model: 'Model', effort: 'high' as const },
    }))
    const html = renderToStaticMarkup(
      <SessionTabs
        historyEntries={historyEntries(history, FAKE_TIME, () => {})}
        historyOpen
        mobile={false}
        onCancelRename={() => {}}
        onClose={() => {}}
        onCopy={() => {}}
        onMove={() => {}}
        onNew={() => {}}
        onRename={() => {}}
        onSelect={() => {}}
        onShowHistory={() => {}}
        onStartRename={() => {}}
        readOnly={false}
        renaming={null}
        tabs={[
          {
            kind: 'session',
            id: 'a',
            title: 'Address autocomplete',
            name: 'Address autocomplete',
            selected: true,
          },
        ]}
      />,
    )
    expect(textOf(html)).toContain(
      'CX Postcode rules 1d ago CL Field order 3d ago',
    )
  })

  it('keeps Send off while a file uploads or failed', () => {
    const composer = (files: readonly DraftFile[]) =>
      renderToStaticMarkup(
        <Composer
          blocked={false}
          choice={{ agent: 'claude', model: 'Opus 5.5', effort: 'high' }}
          draft={{
            ...blankDraft('draft'),
            text: `See the screenshot. ${files.map(({ id }) => fileMark(id)).join(' ')}`,
            files,
          }}
          files={{
            files: () => files,
            retry: () => undefined,
            subscribe: () => () => undefined,
          }}
          models={[]}
          onAttach={() => []}
          onChangeText={() => {}}
          onChooseModel={() => {}}
          onSend={() => {}}
          onStop={() => {}}
          running={false}
          sending={false}
          stopping={false}
        />,
      )
    const file = new File(['png'], 'overlap.png', { type: 'image/png' })
    const off = /aria-label="Send" aria-disabled="true"/
    const error = new ApiError(502, 'upload_failed', 'The upload failed.')
    expect(composer([uploadingFile('file-1', file, null)])).toMatch(off)
    expect(
      composer([{ state: 'failed', id: 'file-1', file, error, upload: null }]),
    ).toMatch(off)
    expect(composer([])).not.toMatch(off)
  })
})
