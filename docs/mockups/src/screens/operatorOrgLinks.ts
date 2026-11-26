import {
  liftSwitchLine,
  type SwitchWait,
} from '../../../../src/ui/components/operator/switchCopy'
import type { OrgPage } from '../fixtures/operatorPages'
import { paths } from '../paths'

/** The links of a question: the page of Cancel, and the page after it. */
type QuestionLinks = { cancel: string; done: string }

/** The waits that the catalogue draws for a new switch. */
type DrawnWait = Extract<SwitchWait, { kind: 'lift' | 'admin' | 'build' }>

/**
 * Why the build of a new switch must wait, when it must: a suspended org
 * waits for Lift, an org whose admins are all suspended waits for an
 * admin, and a build of the org that runs makes the switch wait for it.
 */
export function switchWaitOf(org: OrgPage): DrawnWait | undefined {
  if (org.suspension) return { kind: 'lift' }
  const admins = org.members.filter((member) => member.role === 'Admin')
  if (admins.every((member) => member.suspended === true)) {
    return { kind: 'admin' }
  }
  if (org.runningBuild) return { kind: 'build', ...org.runningBuild }
  return undefined
}

/**
 * The links of the switch question: back to the page, and on to the
 * switch that waits, or to its build, which starts at once.
 */
export function switchLinks(org: OrgPage): QuestionLinks {
  const cancel = org.suspension ? paths.operatorOrgSuspended : paths.operatorOrg
  switch (switchWaitOf(org)?.kind) {
    case 'lift':
      return { cancel, done: paths.operatorOrgSwitchWaitingSuspended }
    case 'admin':
      return { cancel, done: paths.operatorOrgSwitchWaitingAdmin }
    case 'build':
      return { cancel, done: paths.operatorOrgSwitchWaiting }
    case undefined:
      return { cancel, done: paths.operatorOrgSwitchBuild }
  }
}

/** Stop switch returns to the org on its account, with no switch. */
export const stopLinks: QuestionLinks = {
  cancel: paths.operatorOrgSwitchBuild,
  done: paths.operatorOrg,
}

/**
 * The question of the action of the Provider account box, for the pages
 * that draw it: Stop switch while the switch build runs, and Switch
 * account over the page in use, with a build that runs, with three
 * accounts, or suspended. The catalogue draws no question for a deleted
 * org, a waiting switch, or a switch back after a switch.
 */
export function accountQuestion(
  org: OrgPage,
  accounts: 'two' | 'three',
): string | undefined {
  const build = org.switch?.build.state
  if (build === 'building') return paths.operatorOrgSwitchBuildStop
  if (build === 'waiting' || org.deleted || org.lastSwitch) return undefined
  if (org.suspension) return paths.operatorOrgSwitchSuspended
  if (accounts === 'three') return paths.operatorOrgSwitchThreeAccounts
  if (org.runningBuild) return paths.operatorOrgSwitchRunningBuild
  return paths.operatorOrgSwitch
}

/**
 * The question of Lift, and its links. While a switch waits for Lift, the
 * question adds that Lift starts the switch build, and the lift leads to
 * that build.
 */
export function liftOf(
  org: OrgPage,
  flow: { page: string; suspended: string; lift: string },
): { open: string; links: QuestionLinks; extra?: string } {
  const item = org.switch
  if (item?.build.state === 'waiting' && item.build.wait.kind === 'lift') {
    return {
      open: paths.operatorOrgSwitchWaitingLift,
      links: {
        cancel: paths.operatorOrgSwitchWaitingSuspended,
        done: paths.operatorOrgSwitchBuild,
      },
      extra: liftSwitchLine(item.to),
    }
  }
  return {
    open: flow.lift,
    links: { cancel: flow.suspended, done: flow.page },
  }
}
