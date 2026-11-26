import type { OperatorOrgDetail } from '../../shared/operator'
import {
  operatorOrgSwitchPath,
  type OperatorOrgSwitchResponse,
  type OperatorProviderSwitch,
  type OperatorSwitchActor,
} from '../../shared/operator-switch'
import { sampleSwitch } from '../../test-support/fixtures/operator-switch'
import { ID, json, RouteError, type Route } from './router'

/**
 * The switches of the provider account of one org in the dev fake: the
 * switch that waits, builds, or failed, the last switch that changed the
 * account, and the workspaces on each account after it.
 */
export interface DevOrgSwitches {
  current: OperatorProviderSwitch | null
  last: OperatorProviderSwitch | null
  byAccount?: readonly { id: string; workspaces: number }[]
}

/** The switches of every org, and whether each switch and stop fails. */
export interface DevSwitches {
  orgs: Map<string, DevOrgSwitches>
  saveFails: boolean
}

/**
 * The page of an org with its switches, as the Worker gives it: the open or
 * failed switch, the last switch, and the account that it changed. A switch
 * that waits for a job names the job that runs, and a switch build that
 * runs counts as a build that runs.
 */
export function withSwitches(
  detail: OperatorOrgDetail,
  switches: DevSwitches,
): OperatorOrgDetail {
  const org = switches.orgs.get(detail.id)
  if (!org) return { ...detail, switchAvailable: true }
  const { current, last } = org
  const building = current?.state === 'building'
  return {
    ...detail,
    switchAvailable: true,
    providerAccount: last?.toAccount ?? detail.providerAccount,
    providerSwitch:
      current?.waitReason === 'job'
        ? { ...current, waitingJob: detail.runningJob ?? null }
        : current,
    lastProviderSwitch: last,
    workspacesByAccount: org.byAccount ?? detail.workspacesByAccount,
    running: {
      ...detail.running,
      builds: detail.running.builds + (building ? 1 : 0),
    },
  }
}

const invalid = () =>
  new RouteError(400, 'invalid_input', 'Choose another configured account.')

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The switch of a POST, as the Worker reads it: another configured account,
 * and an optional choice to end the job that runs.
 */
function requestOf(
  body: unknown,
  accounts: readonly string[],
  current: string,
): { to: string; end: boolean } {
  const to = isObject(body) ? body.providerAccount : undefined
  if (typeof to !== 'string' || !accounts.includes(to) || to === current) {
    throw invalid()
  }
  const end = isObject(body) ? body.endRunningJob : undefined
  if (end !== undefined && typeof end !== 'boolean') throw invalid()
  return { to, end: end ?? false }
}

/**
 * Switch account and Stop switch of the dev fake. A switch waits for the job
 * that runs, unless the operator ends it, and for Lift, Restore, or an
 * admin, as the org detail says. Else its build runs at once. A switch
 * build of the dev fake runs until Stop switch. Stop switch stops a switch
 * that waits or builds. `switchSave=fail` fails each of them.
 */
export function switchRoutes(
  switches: DevSwitches,
  kit: {
    now: () => number
    newId: () => string
    accounts: () => readonly string[]
    orgOf: (orgId: string) => OperatorOrgDetail
    operator: () => OperatorSwitchActor
  },
): Route[] {
  const fail = () => {
    if (switches.saveFails) {
      throw new RouteError(500, 'server_error', 'The request failed.')
    }
  }
  const reply = (item: OperatorProviderSwitch | null) =>
    json({ switch: item } satisfies OperatorOrgSwitchResponse)
  return [
    {
      method: 'POST',
      path: operatorOrgSwitchPath(ID.org),
      answer: ({ params, body }) => {
        const org = kit.orgOf(params.org)
        fail()
        const open = org.providerSwitch
        if (open?.state === 'waiting' || open?.state === 'building') {
          return reply(open)
        }
        const { to, end } = requestOf(body, kit.accounts(), org.providerAccount)
        const job = org.runningJob ?? null
        const reason = org.switchWaitReason ?? null
        const waits = reason !== null && !(reason === 'job' && end)
        const now = kit.now()
        const item = sampleSwitch(org.id, now, {
          id: kit.newId(),
          fromAccount: org.providerAccount,
          toAccount: to,
          operator: kit.operator(),
          endRunningJob: end,
          endRunningJobId: end ? (job?.id ?? null) : null,
          ...(waits
            ? { waitReason: reason, waitingJob: reason === 'job' ? job : null }
            : { state: 'building', buildId: kit.newId(), buildStartedAt: now }),
        })
        const before = switches.orgs.get(org.id)
        switches.orgs.set(org.id, {
          ...before,
          current: item,
          last: before?.last ?? null,
        })
        return reply(item)
      },
    },
    {
      method: 'DELETE',
      path: operatorOrgSwitchPath(ID.org),
      answer: ({ params }) => {
        const org = kit.orgOf(params.org)
        fail()
        const record = switches.orgs.get(org.id)
        const open = record?.current
        if (!record || !open || open.state === 'failed') return reply(null)
        const stopped: OperatorProviderSwitch = {
          ...open,
          state: 'stopped',
          stoppedAt: kit.now(),
          stoppedBy: kit.operator(),
        }
        switches.orgs.set(org.id, { ...record, current: null })
        return reply(stopped)
      },
    },
  ]
}

/**
 * A lift of an org starts its switch build that waits for Lift, and a
 * suspension makes a switch build that runs wait for Lift, as the Worker
 * does.
 */
export function followSuspension(
  switches: DevSwitches,
  orgId: string,
  suspended: boolean,
  now: number,
): void {
  const record = switches.orgs.get(orgId)
  const open = record?.current
  if (!record || !open) return
  if (suspended && open.state === 'building') {
    switches.orgs.set(orgId, {
      ...record,
      current: { ...open, state: 'waiting', waitReason: 'suspended' },
    })
  }
  if (!suspended && open.waitReason === 'suspended') {
    switches.orgs.set(orgId, {
      ...record,
      current: {
        ...open,
        state: 'building',
        waitReason: null,
        buildId: `${orgId}-switch-build`,
        buildStartedAt: now,
      },
    })
  }
}
