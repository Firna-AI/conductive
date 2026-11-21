// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { operatorOrgPath } from '../../shared/operator'
import { operatorProvidersPath } from '../../shared/operator-providers'
import { operatorOrgSwitchPath } from '../../shared/operator-switch'
import { queryByRole } from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { settle } from '../test-mount'
import { operatorRequests } from './operator-test-kit'
import { failure } from './providers-test-kit'
import {
  buildingSwitch as building,
  openOrgPage,
  pressBox,
  pressQuestion,
  questionText,
  QUIET_ORG,
  quietSwitch,
  shownIn,
  switchReply as reply,
} from './switch-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const toE2b = 'Switch Kestrel Labs to e2b?'
const stopTitle = 'Stop the switch to e2b?'

describe('Stop switch and failed writes on the page of an org', () => {
  test('Stop switch asks first, sends {} with DELETE, and reads the org again, and the question of a waiting switch leaves out the build', async () => {
    const waiting = await openOrgPage(QUIET_ORG, {
      change: (org) => ({
        ...org,
        providerSwitch: quietSwitch({ state: 'waiting', waitReason: 'admin' }),
      }),
    })
    pressBox(waiting.view, 'Stop switch')
    const waitingQuestion = questionText(stopTitle)
    pressQuestion(stopTitle, 'Cancel')
    const { server, org, view, box } = await openOrgPage(QUIET_ORG, {
      change: (item) => ({ ...item, providerSwitch: building }),
    })
    server.json(
      'DELETE',
      operatorOrgSwitchPath(org.id),
      reply({ ...building, state: 'stopped', stoppedAt: FAKE_TIME }),
    )
    server.json('GET', operatorOrgPath(org.id), {
      ...org,
      providerSwitch: null,
    })
    pressBox(view, 'Stop switch')
    const question = questionText(stopTitle)
    pressQuestion(stopTitle, 'Stop switch')
    await settle()
    expect({
      waitingQuestion,
      question,
      open: queryByRole('dialog', stopTitle),
      box: box(),
      requests: await operatorRequests(server),
    }).toEqual({
      waitingQuestion:
        'Stop the switch to e2b? Kestrel Labs stays on boat, and new workspaces still start there. Cancel Stop switch',
      question:
        'Stop the switch to e2b? The switch build on e2b stops. Kestrel Labs stays on boat, and new workspaces still start there. Cancel Stop switch',
      open: null,
      box: 'Provider account Account boat Switch account',
      requests: [
        `GET ${operatorOrgPath(org.id)}`,
        `GET ${operatorProvidersPath()}`,
        `DELETE ${operatorOrgSwitchPath(org.id)} {}`,
        `GET ${operatorOrgPath(org.id)}`,
      ],
    })
  })

  test('a failed switch or stop shows its error in its question, which stays open, and the page reads nothing', async () => {
    const switching = await openOrgPage(QUIET_ORG)
    const switchPath = operatorOrgSwitchPath(QUIET_ORG)
    switching.server.json('POST', switchPath, failure, 500)
    pressBox(switching.view, 'Switch account')
    pressQuestion(toE2b, 'Switch account')
    await settle()
    const switchError = ["Kestrel Labs wasn't switched", 'The request failed.']
    const shownSwitch = shownIn(toE2b, switchError)
    const switchRequests = await operatorRequests(switching.server)
    pressQuestion(toE2b, 'Cancel')
    const stopping = await openOrgPage(QUIET_ORG, {
      change: (org) => ({ ...org, providerSwitch: building }),
    })
    stopping.server.json('DELETE', switchPath, failure, 500)
    pressBox(stopping.view, 'Stop switch')
    pressQuestion(stopTitle, 'Stop switch')
    await settle()
    const stopError = [
      "The switch of Kestrel Labs wasn't stopped",
      'The request failed.',
    ]
    expect({
      switchError: shownSwitch,
      switchRequests,
      stopError: shownIn(stopTitle, stopError),
      stopRequests: await operatorRequests(stopping.server),
    }).toEqual({
      switchError,
      switchRequests: [
        `GET ${operatorOrgPath(QUIET_ORG)}`,
        `GET ${operatorProvidersPath()}`,
        `POST ${switchPath} {"providerAccount":"e2b","endRunningJob":false}`,
      ],
      stopError,
      stopRequests: [
        `GET ${operatorOrgPath(QUIET_ORG)}`,
        `GET ${operatorProvidersPath()}`,
        `DELETE ${switchPath} {}`,
      ],
    })
  })
})
