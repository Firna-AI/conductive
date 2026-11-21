import { describe, expect, test } from 'vitest'
import { operatorOrgPath, orgSuspensionPath } from '../../shared/operator'
import { operatorOrgSwitchPath } from '../../shared/operator-switch'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { devFetch } from './dev-test-kit'

const kestrel = 'org_k3str3l'
const now = FAKE_TIME + 60_000
const operator = { githubId: 1, login: 'calummoore' }

describe('the switch routes of the dev fake', () => {
  test('build at once or wait as the org detail says, keep one open switch, stop it, start the build that waits for Lift at Lift, and refuse what the Worker refuses', async () => {
    const { send } = devFetch('?operator=1')
    const path = operatorOrgSwitchPath(kestrel)
    const same = await send('POST', path, { providerAccount: 'boat' })
    const switched = await send('POST', path, { providerAccount: 'e2b' })
    const repeat = await send('POST', path, { providerAccount: 'e2b' })
    const page = await send('GET', operatorOrgPath(kestrel))
    const stopped = await send('DELETE', path)
    const after = await send('GET', operatorOrgPath(kestrel))
    const hexwave = SAMPLE_IDS.suspendedOrg
    const waits = await send('POST', operatorOrgSwitchPath(hexwave), {
      providerAccount: 'e2b',
    })
    await send('DELETE', orgSuspensionPath(hexwave))
    const lifted = await send('GET', operatorOrgPath(hexwave))
    expect({
      same,
      switched,
      repeat: repeat.body,
      page: page.body,
      stopped: stopped.body,
      after: after.body,
      waits: waits.body,
      lifted: lifted.body,
    }).toMatchObject({
      same: {
        status: 400,
        body: { error: { code: 'invalid_input' } },
      },
      switched: {
        status: 200,
        body: {
          switch: {
            orgId: kestrel,
            fromAccount: 'boat',
            toAccount: 'e2b',
            operator,
            state: 'building',
            buildStartedAt: now,
          },
        },
      },
      repeat: { switch: { state: 'building', requestedAt: now } },
      page: {
        switchAvailable: true,
        providerSwitch: { state: 'building' },
        running: { builds: 1 },
      },
      stopped: {
        switch: { state: 'stopped', stoppedAt: now, stoppedBy: operator },
      },
      after: { providerAccount: 'boat', providerSwitch: null },
      waits: { switch: { state: 'waiting', waitReason: 'suspended' } },
      lifted: {
        providerSwitch: { state: 'building', buildStartedAt: now },
      },
    })
  })

  test('switches=1 shows a state in each sample org, and switchSave=fail fails each switch and stop', async () => {
    const { send } = devFetch('?operator=1&switches=1&switchSave=fail')
    const states = await Promise.all(
      ['org_blu3h4rb', 'org_0rb1tstd', 'org_n0rthw1nd', kestrel].map(
        async (id) => (await send('GET', operatorOrgPath(id))).body,
      ),
    )
    const failed = await send('DELETE', operatorOrgSwitchPath('org_blu3h4rb'))
    expect({ states, failed: failed.status }).toMatchObject({
      states: [
        { switchAvailable: true, providerSwitch: { state: 'building' } },
        {
          switchAvailable: true,
          providerSwitch: { state: 'failed', failure: 'provider' },
        },
        {
          switchAvailable: true,
          providerSwitch: {
            state: 'waiting',
            waitReason: 'job',
            waitingJob: { starter: { login: 'li-wei' } },
          },
        },
        {
          switchAvailable: true,
          providerAccount: 'e2b',
          lastProviderSwitch: { state: 'completed', fromAccount: 'boat' },
        },
      ],
      failed: 500,
    })
  })
})
