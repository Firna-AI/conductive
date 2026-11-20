// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { operatorOrgPath, type OperatorOrgDetail } from '../../shared/operator'
import { operatorProvidersPath } from '../../shared/operator-providers'
import { operatorOrgSwitchPath } from '../../shared/operator-switch'
import { byRole, byText, queryByRole } from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle } from '../test-mount'
import { operatorRequests } from './operator-test-kit'
import {
  buildingSwitch as building,
  MINUTE,
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

const quietQuestion = `${toE2b} The switch builds the cloud computer of Kestrel Labs again on the e2b account, with the same repositories and install script. New workspaces start on e2b when that build succeeds, and on boat until then. Existing workspaces stay on boat. If the build fails, Kestrel Labs stays on boat. Only this page shows the build.`

describe('Switch account on the page of an org', () => {
  test('asks first with the one other account, sends it with POST, reads the org again, and shows the switch build', async () => {
    const { server, org, view, box } = await openOrgPage(QUIET_ORG)
    server.json('POST', operatorOrgSwitchPath(org.id), reply(building))
    server.json('GET', operatorOrgPath(org.id), {
      ...org,
      providerSwitch: building,
    } satisfies OperatorOrgDetail)
    pressBox(view, 'Switch account')
    const question = questionText(toE2b)
    pressQuestion(toE2b, 'Switch account')
    await settle()
    expect({
      question,
      open: queryByRole('dialog', toE2b),
      box: box(),
      requests: await operatorRequests(server),
    }).toEqual({
      question: `${quietQuestion} Cancel Switch account`,
      open: null,
      box: 'Provider account Account boat Switch to e2b Started on 15 Jan at 07:48 by @calummoore Switch build Building · 0s New workspaces start on boat until this build succeeds. Each build has a 60-minute limit. Stop switch',
      requests: [
        `GET ${operatorOrgPath(org.id)}`,
        `GET ${operatorProvidersPath()}`,
        `POST ${operatorOrgSwitchPath(org.id)} {"providerAccount":"e2b","endRunningJob":false}`,
        `GET ${operatorOrgPath(org.id)}`,
      ],
    })
  })

  test('with more accounts, offers each other account by its ID, and the title, the words, and the request follow the choice', async () => {
    const { server, org, view } = await openOrgPage(QUIET_ORG, {
      accounts: ['boat', 'e2b', 'e2b-us'],
    })
    server.json('POST', operatorOrgSwitchPath(org.id), reply(building))
    pressBox(view, 'Switch account')
    const choice = byRole('radiogroup', 'New account')
    const options = Array.from(
      choice.querySelectorAll('[role="radio"]'),
      (radio) =>
        radio.getAttribute('aria-checked') === 'true'
          ? `${radio.textContent ?? ''} (chosen)`
          : (radio.textContent ?? ''),
    )
    click(byRole('radio', 'e2b-us', choice))
    const toUs = 'Switch Kestrel Labs to e2b-us?'
    const chosen = shownIn(toUs, [
      'The switch builds the cloud computer of Kestrel Labs again on the e2b-us account, with the same repositories and install script. New workspaces start on e2b-us when that build succeeds, and on boat until then.',
    ])
    pressQuestion(toUs, 'Switch account')
    await settle()
    expect({
      options,
      chosen: chosen.length,
      sent: (await operatorRequests(server))[2],
    }).toEqual({
      options: ['e2b (chosen)', 'e2b-us'],
      chosen: 1,
      sent: `POST ${operatorOrgSwitchPath(org.id)} {"providerAccount":"e2b-us","endRunningJob":false}`,
    })
  })

  test('while a build or a refresh runs, names it and offers to end it, off by default, and the offer that is on ends it', async () => {
    const refresh = await openOrgPage(QUIET_ORG, {
      change: (org) => ({
        ...org,
        switchWaitReason: 'job',
        runningJob: {
          id: 'refresh-1',
          kind: 'refresh',
          startedAt: FAKE_TIME - 3 * MINUTE,
          starter: null,
        },
      }),
    })
    pressBox(refresh.view, 'Switch account')
    const refreshQuestion = questionText(toE2b)
    pressQuestion(toE2b, 'Cancel')
    const { server, org, view } = await openOrgPage(SAMPLE_IDS.activeOrg)
    server.json('POST', operatorOrgSwitchPath(org.id), reply(building))
    pressBox(view, 'Switch account')
    const title = 'Switch Northwind to e2b?'
    const question = questionText(title)
    const offer = byText(
      'End the build of @li-wei now',
      byRole('dialog', title),
    ).closest('label')
    const check = offer?.querySelector('input')
    if (!check) throw new Error('The question has no offer.')
    const checked = check.checked
    click(check)
    pressQuestion(title, 'Switch account')
    await settle()
    expect({
      question,
      checked,
      refresh: refreshQuestion.slice(quietQuestion.length),
      sent: (await operatorRequests(server))[2],
    }).toEqual({
      question:
        'Switch Northwind to e2b? The switch builds the cloud computer of Northwind again on the e2b account, with the same repositories and install script. New workspaces start on e2b when that build succeeds, and on boat until then. Existing workspaces stay on boat. If the build fails, Northwind stays on boat. Only this page shows the build. A build of Northwind runs now. @li-wei started it 6 minutes ago. The switch build starts when that build ends. End the build of @li-wei now That build fails, and the switch build starts at once. An admin can try it again. Cancel Switch account',
      checked: false,
      refresh:
        ' A refresh of Kestrel Labs runs now. It started 3 minutes ago. The switch build starts when that refresh ends. End that refresh now That refresh fails, and the switch build starts at once. An admin can try it again. Cancel Switch account',
      sent: `POST ${operatorOrgSwitchPath(org.id)} {"providerAccount":"e2b","endRunningJob":true}`,
    })
  })

  test('a suspended org says that the switch build starts at Lift, and while that switch waits, the question of Lift says that Lift starts it', async () => {
    const hexwave = await openOrgPage(SAMPLE_IDS.suspendedOrg)
    pressBox(hexwave.view, 'Switch account')
    const toHexwave = 'Switch Hexwave to e2b?'
    const waitLine = shownIn(toHexwave, [
      'Hexwave is suspended, so the switch build starts at Lift.',
    ])
    pressQuestion(toHexwave, 'Cancel')
    const waiting = await openOrgPage(SAMPLE_IDS.suspendedOrg, {
      change: (org) => ({
        ...org,
        providerSwitch: {
          ...quietSwitch({ state: 'waiting', waitReason: 'suspended' }),
          orgId: org.id,
        },
      }),
    })
    click(byRole('button', 'Lift suspension', waiting.view))
    expect({
      waitLine,
      lift: questionText('Lift the suspension of Hexwave?'),
    }).toEqual({
      waitLine: ['Hexwave is suspended, so the switch build starts at Lift.'],
      lift: 'Lift the suspension of Hexwave? Members can change Hexwave again, and its workspaces can start again. A workspace on the boat account that stopped 14 days ago or more may have lost its files. Lift also starts the switch build on e2b. Cancel Lift suspension',
    })
  })
})
