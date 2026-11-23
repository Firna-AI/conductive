import type {
  OperatorProviderSwitch,
  OperatorSwitchWaitReason,
} from '../../shared/operator-switch'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleSwitch } from '../../test-support/fixtures/operator-switch'
import type { DevOptions } from './options'
import type { DevOrgSwitches, DevSwitches } from './switch-routes'

const MINUTE = 60_000

/** A switch of a sample org from `boat` to `e2b` that started at `at`. */
function seeded(
  orgId: string,
  at: number,
  change: Partial<OperatorProviderSwitch>,
): DevOrgSwitches {
  return { current: sampleSwitch(orgId, at, change), last: null }
}

/**
 * The switches of `switches=1`, one state in each sample org: the switch
 * build of Blue Harbor runs, the one of Orbit Studio failed, Kestrel Labs
 * switched two days ago, Northwind waits for the build of Li Wei, Hexwave
 * for Lift, Dana's Lab for an admin, and Pinecrest for Restore.
 */
function sampleSwitches(): Map<string, DevOrgSwitches> {
  const waits: readonly [string, OperatorSwitchWaitReason][] = [
    ['org_n0rthw1nd', 'job'],
    ['org_h3xw4v8q', 'suspended'],
    ['org_d4n4l4b', 'admin'],
    ['org_p1n3cr7t', 'deleted'],
  ]
  const started = FAKE_TIME - 30 * MINUTE
  const switched = FAKE_TIME - 2 * 24 * 60 * MINUTE
  return new Map([
    [
      'org_blu3h4rb',
      seeded('org_blu3h4rb', FAKE_TIME - 5 * MINUTE, {
        state: 'building',
        buildId: 'org_blu3h4rb-switch-build',
        buildStartedAt: FAKE_TIME - 4 * MINUTE - 12_000,
      }),
    ],
    [
      'org_0rb1tstd',
      seeded('org_0rb1tstd', started, {
        state: 'failed',
        buildId: 'org_0rb1tstd-switch-build',
        buildStartedAt: started,
        buildCompletedAt: started + 10 * MINUTE + 4_000,
        failure: 'provider',
      }),
    ],
    [
      'org_k3str3l',
      {
        current: null,
        last: sampleSwitch('org_k3str3l', switched - 7 * MINUTE, {
          state: 'completed',
          accountChangedAt: switched,
        }),
        byAccount: [
          { id: 'boat', workspaces: 210 },
          { id: 'e2b', workspaces: 2 },
        ],
      },
    ],
    ...waits.map(([orgId, waitReason]): [string, DevOrgSwitches] => [
      orgId,
      seeded(orgId, FAKE_TIME - 12 * MINUTE, { state: 'waiting', waitReason }),
    ]),
  ])
}

/** The switches of the options. */
export function seedSwitches(options: DevOptions): DevSwitches {
  return {
    orgs: options.switches ? sampleSwitches() : new Map(),
    saveFails: options.switchSaveFails,
  }
}
