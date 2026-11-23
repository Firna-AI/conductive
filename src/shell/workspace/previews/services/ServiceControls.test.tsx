// @vitest-environment happy-dom

import { act, useSyncExternalStore } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../../app/router'
import { Store, useStore, type Readable } from '../../../../app/store'
import { servicesView } from '../../../../previews/services/servicesState'
import { ServicesStore } from '../../../../previews/services/servicesStore'
import { readServiceControlRequest } from '../../../../shared/service-inputs'
import {
  byRole,
  queryByRole,
  queryByText,
  shownToasts,
} from '../../../../test-support/dom-queries'
import { FAKE_IDS } from '../../../../test-support/fixtures/core'
import { serviceList } from '../../../../test-support/fixtures/services'
import {
  deferred,
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../../../test-support/mount'
import { mountScreen, settle } from '../../../test-mount'
import { startedApp } from '../../../test-render'
import { OverlayHost } from '../../../ui/Overlay'
import { ServiceSection } from './ServiceSection'
import {
  menuItem,
  openPreviewTool,
  sentControls,
  serviceRoutes,
  servicesServer,
  shownServices,
  stopQuestion,
} from './services-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const failure = { code: 'service_restart_failed', message: 'It did not start.' }

/** The toasts that show: whether each names the failed Restart of `web`. */
function restartFailures(): boolean[] {
  return shownToasts().map(
    (toast) =>
      (toast.textContent?.startsWith("Couldn't restart web.") ?? false) &&
      (toast.textContent?.includes(failure.message) ?? false),
  )
}

/** Whether a button is off. */
function isOff(button: HTMLElement): boolean {
  return button instanceof HTMLButtonElement && button.disabled
}

/** The Services part of a store, for a viewer whose right `allowed` gives. */
function Section(props: { store: ServicesStore; allowed: Readable<boolean> }) {
  const { store } = props
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const controls = useStore(props.allowed)
  const view = servicesView(state)
  if (view.kind === 'none') return null
  return (
    <ServiceSection
      controls={controls}
      ports={{ current: null, opening: false, onOpen: () => undefined }}
      sessionHref={(sessionId) => `/sessions/${sessionId}`}
      state={state}
      store={store}
      view={view}
    />
  )
}

describe('Stop and Restart of a service', () => {
  test('Stop asks first and Cancel sends nothing, Stop then shows Stopping… with the menu off and Show log on, and a failed Restart says Restart', async () => {
    holdAnimationFrames()
    const server = servicesServer(serviceList())
    const stopAnswer = deferred()
    server.handle('POST', serviceRoutes.control, async (http) => {
      const request = readServiceControlRequest(await http.json())
      if (request.action === 'stop') await stopAnswer.promise
      const outcome =
        request.action === 'stop'
          ? { state: 'applied' }
          : { state: 'failed', error: failure }
      return Response.json({ request, outcome })
    })
    const { view } = await openPreviewTool(server)
    await shownServices(view)
    await press(await menuItem('web', 'Stop'))
    await press(byRole('button', 'Cancel', await stopQuestion('web')))
    const afterCancel = (await sentControls(server)).length
    await press(await menuItem('web', 'Stop'))
    await press(byRole('button', 'Stop', await stopQuestion('web')))
    await waitFor(() => queryByText('Stopping…', view), 'the Stop that runs')
    const running = {
      menuOff: isOff(byRole('button', 'More for web', view)),
      logOff: isOff(byRole('button', 'Show log of web', view)),
    }
    stopAnswer.resolve()
    await waitFor(() => (queryByText('Stopping…', view) ? null : true), 'end')
    await press(await menuItem('web', 'Restart'))
    // A failed Restart always shows a toast, whatever its words.
    await waitFor(() => shownToasts()[0] ?? null, 'the toast of the Restart')
    const sent = (await sentControls(server)).map(readServiceControlRequest)

    expect({
      afterCancel,
      running,
      sent: sent.map((each) => [each.action, each.target.generation]),
      toasts: restartFailures(),
    }).toEqual({
      afterCancel: 0,
      running: { menuOff: true, logOff: false },
      sent: [
        ['stop', 'web-1'],
        ['restart', 'web-1'],
      ],
      toasts: [true],
    })
  })

  test('a Restart that ends after its workspace screen closed still shows its toast and ends its row, with one request', async () => {
    holdAnimationFrames()
    const server = servicesServer(serviceList())
    const answer = deferred()
    server.handle('POST', serviceRoutes.control, async (http) => {
      const request = readServiceControlRequest(await http.json())
      await answer.promise
      return Response.json({
        request,
        outcome: { state: 'failed', error: failure },
      })
    })
    const { view, navigation } = await openPreviewTool(server)
    await shownServices(view)
    await press(await menuItem('web', 'Restart'))
    await waitFor(
      () => queryByText('Restarting…', view),
      'the Restart that runs',
    )
    navigation.push(routes.org(org))
    await settle()
    const away = queryByRole('list', 'Services in this sandbox')
    answer.resolve()
    navigation.push(routes.workspace(org, workspace, 'preview'))
    const list = await shownServices(view)
    // The row waits until the answer, so its menu turns on after it.
    await waitFor(() => {
      const more = queryByRole('button', 'More for web', list)
      return more && !isOff(more) ? more : null
    }, 'the end of the Restart')

    expect({
      away,
      toasts: restartFailures(),
      sent: (await sentControls(server)).length,
    }).toEqual({ away: null, toasts: [true], sent: 1 })
  })

  test('a viewer who loses the right to restart keeps the rows and Show log, and loses the menus and an open Stop question', async () => {
    holdAnimationFrames()
    const server = servicesServer(serviceList())
    const app = await startedApp(server)
    const store = new ServicesStore(
      { orgId: org, workspaceId: workspace },
      { ...app.services, fetch: server.fetch },
    )
    store.connect(() => () => undefined)
    const allowed = new Store(true)
    const view = mountScreen(
      app,
      <OverlayHost>
        <Section allowed={allowed} store={store} />
      </OverlayHost>,
    )
    const list = await shownServices(view)
    await press(await menuItem('web', 'Stop'))
    await stopQuestion('web')
    act(() => allowed.set(false))
    await settle()

    expect({
      question: queryByRole('dialog', 'Stop web?'),
      menu: queryByRole('button', 'More for web', list),
      logOff: isOff(byRole('button', 'Show log of web', list)),
      rows: list.querySelectorAll('li').length,
      sent: (await sentControls(server)).length,
    }).toEqual({ question: null, menu: null, logOff: false, rows: 3, sent: 0 })
  })
})
