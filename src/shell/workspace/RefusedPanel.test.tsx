// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { workspacePaths } from '../../shared/workspaces'
import { queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { WorkspaceScreen } from './WorkspaceScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const orgWords =
  'This org is suspended. For questions, write to abuse@conductive.build.'
const ownerWords =
  'The workspace owner is suspended. Ask an admin to assign another member.'

/** The Files tab of the workspace of Acme on a phone. */
async function phoneFiles(server: FakeApiServer): Promise<HTMLElement> {
  const app = await startedApp(server)
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (!org) throw new Error('The fake org is missing.')
  const view = mountScreen(
    app,
    <WorkspaceScreen
      org={org}
      view={['files']}
      viewer={fakeUser}
      workspaceId={FAKE_IDS.workspace}
    />,
    { viewport: 'phone' },
  )
  await settle()
  return view
}

/** What the panel of the Files tab says. */
function panelOf(view: HTMLElement, words: string) {
  const text = view.textContent ?? ''
  const count = (part: string) => text.split(part).length - 1
  return {
    title: count("The sandbox can't start"),
    words: count(words),
    history: count('Your chat history is available.'),
    resume: queryByRole('button', 'Resume', view) !== null,
  }
}

describe('the Files tab of a refused start on a phone', () => {
  test('shows the words of the refusal of the org or of the owner in place of the line on the chat history', async () => {
    const suspendedOrg = new FakeApiServer({ workspaceState: 'ready' })
    serveSuspendedAcme(suspendedOrg)
    const suspendedOwner = new FakeApiServer({ workspaceState: 'stopped' })
    suspendedOwner.json(
      'POST',
      workspacePaths.resume(FAKE_IDS.org, FAKE_IDS.workspace),
      { error: { code: 'user_suspended', message: ownerWords } },
      403,
    )
    expect({
      org: panelOf(await phoneFiles(suspendedOrg), orgWords),
      owner: panelOf(await phoneFiles(suspendedOwner), ownerWords),
    }).toEqual({
      org: { title: 1, words: 1, history: 0, resume: false },
      owner: { title: 1, words: 1, history: 0, resume: false },
    })
  })
})
