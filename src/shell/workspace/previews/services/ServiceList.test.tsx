// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { activeWait } from '../../../../app/org-waits'
import { routes } from '../../../../app/router'
import { ManualDelay } from '../../../../app/test-kit'
import { readServiceLogRequest } from '../../../../shared/service-inputs'
import { workspacePaths } from '../../../../shared/workspaces'
import {
  accessibleName,
  byRole,
  queryByLabel,
  queryByRole,
  queryByText,
} from '../../../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME } from '../../../../test-support/fixtures/core'
import {
  serviceList,
  workerRow,
} from '../../../../test-support/fixtures/services'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../../../test-support/mount'
import { click, settle } from '../../../test-mount'
import { toolHref } from '../../tools/tool-address'
import { linkTo } from '../../wiring-test-kit'
import {
  listReads,
  openPreviewTool,
  serviceRoutes,
  servicesServer,
  shownServices,
} from './services-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The spoken names of the buttons inside an element, in their order. */
function buttonNames(root: Element): string[] {
  return Array.from(root.querySelectorAll('button'), accessibleName)
}

describe('the services of the Preview tool', () => {
  test('on a phone, lists every service above Servers after "+", also the service whose port has an open preview, and shows each owned port once', async () => {
    holdAnimationFrames()
    const server = servicesServer(serviceList())
    const { view } = await openPreviewTool(server, { viewport: 'phone' })
    await press(
      await waitFor(
        () => queryByRole('button', 'Preview another port', view),
        '+',
      ),
    )
    const list = await shownServices(view)
    const source = byRole(
      'link',
      'Started in the session Address autocomplete',
      list,
    )

    expect({
      services: buttonNames(list),
      noPort: queryByText('No port', list) !== null,
      source: source.getAttribute('href'),
      servers: buttonNames(byRole('list', 'Servers in this sandbox', view)),
    }).toEqual({
      services: [
        'Show log of storybook',
        'More for storybook',
        'Open the preview of port 6006',
        'Show log of web',
        'More for web',
        'Open the preview of port 3000',
        'Show log of worker',
        'More for worker',
      ],
      noPort: true,
      source: routes.session(org, id, 'autocomplete'),
      servers: [
        'Port 4321, astro dev in docs',
        'Port 4322, astro dev in marketing-site',
        'Port 5173, vite in packages/address-autocomplete/examples/playground',
      ],
    })
  })

  test('shows a log as plain text with the note of earlier output, reads it again at Reload with a new request ID, and offers Try again after a failed read', async () => {
    holdAnimationFrames()
    const server = servicesServer(serviceList())
    const reads: ReturnType<typeof readServiceLogRequest>[] = []
    let failing = false
    server.handle('POST', serviceRoutes.logs, async (http) => {
      const request = readServiceLogRequest(await http.json())
      reads.push(request)
      return failing
        ? Response.json(
            { error: { code: 'sandbox_unavailable', message: 'No answer.' } },
            { status: 502 },
          )
        : Response.json({
            request,
            result: { state: 'ready', text: '<b>Ready</b>\n', omitted: true },
          })
    })
    const { view } = await openPreviewTool(server)
    await shownServices(view)
    await press(byRole('button', 'Show log of web', view))
    const log = await waitFor(
      () => queryByRole('dialog', 'Log of web'),
      'the log',
    )
    const output = await waitFor(
      () => queryByLabel('Output of web', log),
      'the output',
    )
    const shown = {
      text: output.textContent,
      markup: output.children.length,
      omitted: queryByText('Earlier output is left out.', log) !== null,
    }
    failing = true
    await press(byRole('button', 'Reload', log))
    await waitFor(() => queryByRole('button', 'Try again', log), 'Try again')

    expect({
      shown,
      failure: log.querySelector('[role="alert"]')?.textContent,
      targets: reads.map((read) => read.target.generation),
      ids: new Set(reads.map((read) => read.requestId)).size,
    }).toEqual({
      shown: { text: '<b>Ready</b>\n', markup: 0, omitted: true },
      failure: "The log couldn't load.No answer.",
      targets: ['web-1', 'web-1'],
      ids: 2,
    })
  })

  test('reads the shown list again on the timer of the app, so a service without a port shows its end with no activity, stops while the right column hides or Preview leaves, and reads at once when the column shows again', async () => {
    holdAnimationFrames()
    const delay = new ManualDelay()
    const server = servicesServer(serviceList([workerRow]))
    const { view } = await openPreviewTool(server, { delay: delay.delay })
    await waitFor(() => queryByText('Started 8m ago', view), 'worker running')
    const ended = {
      ...workerRow,
      status: {
        state: 'ended' as const,
        startedAt: workerRow.status.startedAt,
        endedAt: FAKE_TIME - 60_000,
        result: { kind: 'exit' as const, code: 0 },
      },
    }
    server.json('GET', serviceRoutes.catalogue, serviceList([ended], 2))
    // The run ends with the reads that the timers of the wait start.
    await delay.run(activeWait)
    await settle()
    const shown = queryByText('Exit code 0 · 1m ago', view) !== null
    const activity = server.requests.filter(
      (request) =>
        new URL(request.url).pathname === workspacePaths.activity(org, id),
    ).length
    // A hidden right column shows no list, so no timer reads it.
    await press(byRole('button', 'Hide the right column', view))
    const hiddenFrom = listReads(server)
    await delay.runAll()
    const readsWhileHidden = listReads(server) - hiddenFrom
    // The column that shows again reads the list at once.
    const reopenFrom = listReads(server)
    await press(byRole('button', 'Show the right column', view))
    const readsAtReopen = listReads(server) - reopenFrom
    const tools = byRole('region', 'Tools', view)
    click(linkTo(tools, toolHref(org, id, 'terminal')))
    const before = listReads(server)
    await delay.runAll()

    expect({
      shown,
      activity,
      readsWhileHidden,
      readsAtReopen,
      readsAfterLeave: listReads(server) - before,
    }).toEqual({
      shown: true,
      activity: 0,
      readsWhileHidden: 0,
      readsAtReopen: 1,
      readsAfterLeave: 0,
    })
  })
})
