// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { workspacePaths } from '../../shared/workspaces'
import {
  byToast,
  queryByRole,
  shownToasts,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const restartPath = workspacePaths.restart(org, id)

/** The whole app on a phone at the open workspace, whose menus are sheets. */
function mountWorkspace(app: AppModel) {
  return mountScreen(
    app,
    <NavigationContext.Provider
      value={memoryNavigation(routes.workspace(org, id))}
    >
      <Shell />
    </NavigationContext.Provider>,
    { viewport: 'phone' },
  )
}

function restarts(server: FakeApiServer): number {
  return server.requests.filter(
    (request) =>
      request.method === 'POST' &&
      new URL(request.url).pathname === restartPath,
  ).length
}

async function openMenu(view: HTMLElement, state: string) {
  await press(
    await waitFor(
      () => queryByRole('button', `${state}. Cloud computer menu`, view),
      `the menu of the state ${state}`,
    ),
  )
  return waitFor(
    () => queryByRole('menuitem', 'Restart'),
    'Restart in the menu of the state',
  )
}

describe('Restart in the header state', () => {
  test('a ready workspace restarts at once and shows Starting until the reply', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    let answer: (response: Response) => void = () => undefined
    server.handle('POST', restartPath, () => {
      return new Promise<Response>((resolve) => {
        answer = resolve
      })
    })
    const view = mountWorkspace(await startedApp(server))
    await press(await openMenu(view, 'Ready'))
    const header = await waitFor(
      () => view.querySelector('header'),
      'the header of the workspace',
    )
    await waitFor(
      () => (header.textContent?.includes('Starting') ? header : null),
      'Starting in the header',
    )
    expect(queryByRole('button', 'Starting. Cloud computer menu', view)).toBe(
      null,
    )
    answer(Response.json({ updateCheck: 'ok' }))
    await waitFor(
      () => queryByRole('button', 'Ready. Cloud computer menu', view),
      'the menu of the state after the reply',
    )
    expect({ restarts: restarts(server), toasts: shownToasts() }).toEqual({
      restarts: 1,
      toasts: [],
    })
  })

  test('a failed update check shows a warning, and a failed restart shows its message', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('POST', restartPath, { updateCheck: 'failed' })
    const view = mountWorkspace(await startedApp(server))
    await press(await openMenu(view, 'Ready'))
    const warning = await waitFor(
      () => (shownToasts().length ? byToast("Couldn't check") : null),
      'the toast of the update check',
    )
    expect(warning.textContent).toContain(
      'The restart uses the installed software.',
    )
    server.json(
      'POST',
      restartPath,
      {
        error: {
          code: 'restart_failed',
          message: "The software didn't restart. Try again.",
        },
      },
      502,
    )
    await press(await openMenu(view, 'Ready'))
    const failure = await waitFor(
      () =>
        shownToasts().some((toast) =>
          toast.textContent?.startsWith("Couldn't restart."),
        )
          ? byToast("Couldn't restart.")
          : null,
      'the toast of the failed restart',
    )
    expect(failure.textContent).toContain(
      "The software didn't restart. Try again.",
    )
    expect(restarts(server)).toBe(2)
  })

  test('while an agent works, Restart asks first, and Cancel sends nothing', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'working' })
    const view = mountWorkspace(await startedApp(server))
    await press(await openMenu(view, 'Working'))
    const cancel = await waitFor(
      () => queryByRole('button', 'Cancel'),
      'the question before Restart',
    )
    expect(document.body.textContent).toContain('Stop the agent and restart?')
    await press(cancel)
    expect(restarts(server)).toBe(0)
    await press(await openMenu(view, 'Working'))
    const confirm = await waitFor(
      () =>
        queryByRole('button', 'Cancel')
          ? queryAllRestart().find((button) => button.tagName === 'BUTTON')
          : null,
      'Restart in the question',
    )
    await press(confirm)
    await waitFor(
      () => (restarts(server) === 1 ? true : null),
      'the restart request',
    )
  })

  test('a suspended org shows the state without the menu', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const view = mountWorkspace(await startedApp(server))
    const header = await waitFor(
      () => view.querySelector('header'),
      'the header of the workspace',
    )
    await waitFor(
      () => (header.textContent?.trim() ? header : null),
      'the text of the header',
    )
    expect(
      Array.from(header.querySelectorAll('button')).some((button) =>
        (button.getAttribute('aria-label') ?? '').includes(
          'Cloud computer menu',
        ),
      ),
    ).toBe(false)
  })
})

/** The buttons named Restart, such as the one of the question. */
function queryAllRestart(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('button, [role="button"]'),
  ).filter((element) => (element.textContent ?? '').trim() === 'Restart')
}
