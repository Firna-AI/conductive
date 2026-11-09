import { describe, expect, test } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import type { OrgRole } from '../../shared/api'
import { attachmentUploadPath } from '../../shared/messages'
import { orgSettingsPaths } from '../../shared/org-settings'
import { workspacesPath } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import { renderScreen, startedApp, textOf } from '../test-render'
import { NewWorkspaceScreen } from './NewWorkspaceScreen'

const hour = 3_600_000

/** Whether each named button can be pressed, in rendered HTML. */
function pressable(html: string, ...names: string[]): Record<string, boolean> {
  const found: Record<string, boolean> = {}
  for (const [, attributes, content] of html.matchAll(
    /<button([^>]*)>([\s\S]*?)<\/button>/g,
  )) {
    const name = /aria-label="([^"]*)"/.exec(attributes)?.[1] ?? textOf(content)
    if (names.includes(name)) found[name] = !attributes.includes('disabled=""')
  }
  return found
}

/** The screen as text. `builtAt` sets when the org image was built. */
async function screenText(role: OrgRole, builtAt?: number): Promise<string> {
  const server = new FakeApiServer({ role })
  if (builtAt !== undefined) {
    server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), {
      builds: [
        {
          id: 'image',
          orgId: FAKE_IDS.org,
          kind: 'build',
          state: 'succeeded',
          startedAt: builtAt - 401_000,
          completedAt: builtAt,
          durationMs: 401_000,
          error: null,
        },
      ],
      currentImageBuildId: 'image',
    })
  }
  const app = await startedApp(server)
  const org = app.org(FAKE_IDS.org)
  await Promise.all(
    (['list', 'repositories', 'builds'] as const).map((part) =>
      org.reload(part),
    ),
  )
  return textOf(
    renderScreen(
      app,
      <NewWorkspaceScreen
        org={{ id: FAKE_IDS.org, name: 'Acme', role }}
        sectionId={null}
      />,
    ),
  )
}

describe('NewWorkspaceScreen', () => {
  test('a suspended org shows the refused bar in place of the composer, and invites no first message', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const app = await startedApp(server)
    const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
    if (!org) throw new Error('The fake org is missing.')
    const html = renderScreen(
      app,
      <NewWorkspaceScreen org={org} sectionId={null} />,
    )
    expect({
      refused: textOf(html).includes(
        "The sandbox can't start This org is suspended. For questions, write to abuse@conductive.build.",
      ),
      start: textOf(html).includes('Start a workspace'),
      composer: html.includes('<textarea'),
    }).toEqual({ refused: true, start: false, composer: false })
  })

  test('the start note says when the image was built, as a time or a date', async () => {
    const cases = [
      ['eight hours ago', FAKE_TIME - 8 * hour, 'built 8 hours ago.'],
      ['ten days ago', FAKE_TIME - 240 * hour, 'built on 5 Jan.'],
    ] as const
    for (const [name, builtAt, expected] of cases) {
      expect(await screenText('admin', builtAt), name).toContain(
        `Starts from the cloud computer of Acme, ${expected}`,
      )
    }
  })

  test('in an org without chosen repositories, an admin gets Choose repositories, and a member reads that an admin chooses them', async () => {
    const seen: Record<string, unknown> = {}
    for (const role of ['admin', 'member'] as const) {
      const server = new FakeApiServer({ role })
      const { repositories } = repositoryFixtures(FAKE_IDS.org).repositories
      server.json('GET', orgSettingsPaths.repositories(FAKE_IDS.org), {
        repositories: repositories.map((item) => ({
          ...item,
          selected: false,
        })),
      })
      const app = await startedApp(server)
      await app.org(FAKE_IDS.org).reload('repositories')
      const html = renderScreen(
        app,
        <NewWorkspaceScreen
          org={{ id: FAKE_IDS.org, name: 'Acme', role }}
          sectionId={null}
        />,
      )
      seen[role] = {
        words: /Start a workspace (.*?\.)/.exec(textOf(html))?.[1],
        buttons: pressable(html, 'Choose repositories'),
      }
    }
    expect(seen).toEqual({
      admin: {
        words: 'Choose the repositories of Acme first.',
        buttons: { 'Choose repositories': true },
      },
      member: {
        words: 'An admin of Acme chooses its repositories first.',
        buttons: {},
      },
    })
  })

  test('while the repositories of the org load, the empty chat asks for none', async () => {
    // The screen renders before any read of the repositories.
    const app = await startedApp(new FakeApiServer())
    const html = renderScreen(
      app,
      <NewWorkspaceScreen
        org={{ id: FAKE_IDS.org, name: 'Acme', role: 'admin' }}
        sectionId={null}
      />,
    )
    expect({
      asks: textOf(html).includes('Choose the repositories of Acme first'),
      buttons: pressable(html, 'Choose repositories'),
    }).toEqual({ asks: false, buttons: {} })
  })

  test('the paperclip waits for the create, and Try again waits for the files and the agent login, as Send does', async () => {
    const server = new FakeApiServer()
    const createPath = workspacesPath(FAKE_IDS.org)
    server.json(
      'POST',
      createPath,
      { error: { code: 'start_failed', message: 'It did not start.' } },
      502,
    )
    const held = new HeldRequests(server)
    const app = await startedApp(server, { fetch: held.fetch })
    const org = app.org(FAKE_IDS.org)
    await org.reload('repositories')
    const draft = org.newWorkspace(null)
    draft.setText('Fix the flaky cart test.')
    const buttons = (...names: string[]) =>
      pressable(
        renderScreen(
          app,
          <NewWorkspaceScreen
            org={{ id: FAKE_IDS.org, name: 'Acme', role: 'admin' }}
            sectionId={null}
          />,
        ),
        ...names,
      )
    held.hold('POST', createPath)
    const sending = draft.send({
      repositoryId: 'storefront',
      choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
    })
    const whileSending = buttons('Attach files')
    held.release('POST', createPath)
    await sending
    const uploadPath = attachmentUploadPath(FAKE_IDS.org, {
      type: 'new-workspace',
      messageId: draft.draft.get().messageId,
    })
    held.hold('POST', uploadPath)
    const uploading = draft.attach([
      new File(['Cart notes'], 'notes.txt', { type: 'text/plain' }),
    ])
    const whileUploading = buttons('Send', 'Try again')
    held.release('POST', uploadPath)
    await uploading
    const uploaded = buttons('Send', 'Try again')
    await app.account.removeLogin('claude')
    expect({
      whileSending,
      whileUploading,
      uploaded,
      disconnected: buttons('Send', 'Try again'),
    }).toEqual({
      whileSending: { 'Attach files': false },
      whileUploading: { Send: false, 'Try again': false },
      uploaded: { Send: true, 'Try again': true },
      disconnected: { Send: false, 'Try again': false },
    })
  })

  test('a create request that fails before the server takes the message shows the message that the Worker saved for its start, and other server errors keep the fixed text', async () => {
    const cases = [
      {
        name: 'a start that passed its limit',
        status: 502,
        code: 'workspace_start_failed',
        message:
          'The cloud computer did not start within the 20-minute limit. Try again.',
        notice:
          "The workspace wasn't created The cloud computer did not start within the 20-minute limit. Try again. Your message is kept. Try again",
      },
      {
        name: 'another server error',
        status: 500,
        code: 'internal_error',
        message: 'The request failed. Try again.',
        notice:
          "The workspace wasn't created Its sandbox didn't start. Your message is kept. Try again",
      },
    ]
    for (const item of cases) {
      const server = new FakeApiServer()
      server.json(
        'POST',
        workspacesPath(FAKE_IDS.org),
        { error: { code: item.code, message: item.message } },
        item.status,
      )
      const app = await startedApp(server)
      const org = app.org(FAKE_IDS.org)
      await org.reload('repositories')
      const draft = org.newWorkspace(null)
      draft.setText('Fix the flaky cart test.')
      await draft.send({
        repositoryId: 'storefront',
        choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
      })
      const text = textOf(
        renderScreen(
          app,
          <NewWorkspaceScreen
            org={{ id: FAKE_IDS.org, name: 'Acme', role: 'admin' }}
            sectionId={null}
          />,
        ),
      )
      expect(text, item.name).toContain(item.notice)
    }
  })
})
