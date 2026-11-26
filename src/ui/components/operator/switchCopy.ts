/**
 * The words of the provider account of an org on its page in the operator
 * section: the Provider account box, Switch account and its question, the
 * states of a switch, and Stop switch. Operator screens name each account
 * by its ID, such as `boat` or `e2b`, in plain text in a sentence, as the
 * questions of Suspend and Lift do. A login goes in without `@`, and a time
 * as the page writes it. This module imports no fixture, so the app uses it
 * too.
 */

/** Why a switch build waits before it starts. */
export type SwitchWait =
  /**
   * A build of the org runs: its starter, or null when the app knows none,
   * and when it started.
   */
  | { kind: 'build'; by: string | null; since: string }
  /** A refresh of the org runs, and when it started. It names no starter. */
  | { kind: 'refresh'; since: string }
  /** The org is suspended, and no build runs until Lift. */
  | { kind: 'lift' }
  /** An admin deleted the org, and no build runs until Restore. */
  | { kind: 'restore' }
  /** Every admin of the org is suspended, and the build runs for an admin. */
  | { kind: 'admin' }
  /** Nothing holds the build back, and the app starts it on its own. */
  | { kind: 'start' }

/** A wait for a job of the org that runs: a build or a refresh. */
export type JobWait = Extract<SwitchWait, { kind: 'build' | 'refresh' }>

/**
 * Why a switch build failed, in words for the operator: the new account
 * gave only errors for the 10 minutes of its retries, the install script
 * failed, or the build passed its 60-minute limit.
 */
export type SwitchFailure = 'account' | 'script' | 'time-limit'

/** The build of a switch on the new account, in each of its states. */
export type SwitchBuild =
  | { state: 'waiting'; wait: SwitchWait }
  | { state: 'building'; elapsed: string }
  | { state: 'failed'; duration: string; failure: SwitchFailure }

/**
 * The newest switch of an org that did not change its account: the new
 * account, when and by which operator it started, and its build. The
 * operator is null when the app knows none.
 */
export type OrgSwitch = {
  to: string
  when: string
  by: string | null
  build: SwitchBuild
}

/** The last switch that changed the account of the org. */
export type LastSwitch = { from: string; when: string; by: string | null }

/** The labels of the Provider account box and of its questions. */
export const switchWords = {
  title: 'Provider account',
  to: 'Switch to',
  build: 'Switch build',
  last: 'Last switch',
  byAccount: 'Workspaces by account',
  action: 'Switch account',
  stop: 'Stop switch',
  choice: 'New account',
} as const

/** The title of the question before a switch. */
export function switchTitle(org: string, to: string): string {
  return `Switch ${org} to ${to}?`
}

/**
 * The paragraphs of the question before a switch: the build on the new
 * account, when new workspaces move, and what stays on the old account.
 */
export function switchQuestion(
  org: string,
  from: string,
  to: string,
): readonly string[] {
  return [
    `The switch builds the cloud computer of ${org} again on the ${to} account, with the same repositories and install script. New workspaces start on ${to} when that build succeeds, and on ${from} until then.`,
    `Existing workspaces stay on ${from}. If the build fails, ${org} stays on ${from}. Only this page shows the build.`,
  ]
}

/** The paragraph of the question when the switch build must wait. */
export function switchWaitLine(org: string, wait: SwitchWait): string {
  switch (wait.kind) {
    case 'build':
      return wait.by === null
        ? `A build of ${org} runs now. It started ${wait.since}. The switch build starts when that build ends.`
        : `A build of ${org} runs now. @${wait.by} started it ${wait.since}. The switch build starts when that build ends.`
    case 'refresh':
      return `A refresh of ${org} runs now. It started ${wait.since}. The switch build starts when that refresh ends.`
    case 'lift':
      return `${org} is suspended, so the switch build starts at Lift.`
    case 'restore':
      return `${org} is deleted, so the switch build starts at Restore.`
    case 'admin':
      return `Every admin of ${org} is suspended, so the switch build waits for an admin who is not suspended.`
    case 'start':
      return `The switch build of ${org} starts soon.`
  }
}

/**
 * The offer of the question to end the job that runs, off by default. An
 * ended job fails, as members see it, so an admin can try it again. A
 * build names its starter when the app knows one.
 */
export function endJobOffer(wait: JobWait): { label: string; hint: string } {
  if (wait.kind === 'refresh') {
    return {
      label: 'End that refresh now',
      hint: 'That refresh fails, and the switch build starts at once. An admin can try it again.',
    }
  }
  return endBuildOffer(wait.by)
}

/** The offer of the question to end the build that runs, off by default. */
export function endBuildOffer(by: string | null): {
  label: string
  hint: string
} {
  return {
    label: by === null ? 'End that build now' : `End the build of @${by} now`,
    hint: 'That build fails, and the switch build starts at once. An admin can try it again.',
  }
}

/** The line under the new account: when, and by which operator. */
export function switchStartedLine(when: string, by: string | null): string {
  return by === null ? `Started on ${when}` : `Started on ${when} by @${by}`
}

/** What a failed switch build did, before the words of the old account. */
function failureLine(to: string, failure: SwitchFailure): string {
  switch (failure) {
    case 'account':
      return `The build got errors from ${to}.`
    case 'script':
      return `The install script failed on ${to}.`
    case 'time-limit':
      return 'The build did not finish within its 60-minute limit.'
  }
}

/** The state of the switch build that waits for a job, and why it waits. */
function jobWaitWords(wait: JobWait): { state: string; reason: string } {
  if (wait.kind === 'refresh') {
    return {
      state: 'Waits for a refresh',
      reason: `That refresh started ${wait.since}. The switch build starts when it ends.`,
    }
  }
  return {
    state:
      wait.by === null
        ? 'Waits for a build'
        : `Waits for the build of @${wait.by}`,
    reason: `That build started ${wait.since}. The switch build starts when it ends.`,
  }
}

/** The state of the switch build that waits, and why it waits. */
function waitWords(
  org: string,
  wait: SwitchWait,
): { state: string; reason: string } {
  switch (wait.kind) {
    case 'build':
    case 'refresh':
      return jobWaitWords(wait)
    case 'lift':
      return {
        state: 'Waits for Lift',
        reason: `No build runs while ${org} is suspended. Lift starts the switch build.`,
      }
    case 'restore':
      return {
        state: 'Waits for Restore',
        reason: `No build runs while ${org} is deleted. Restore starts the switch build.`,
      }
    case 'admin':
      return {
        state: 'Waits for an admin',
        reason: `The switch build runs for an admin who is not suspended. It starts when ${org} has one.`,
      }
    case 'start':
      return {
        state: 'Starts soon',
        reason: 'The app starts the switch build on its own.',
      }
  }
}

/**
 * The state of the switch build in its row, and the line under it: why it
 * waits, where new workspaces start while it runs, or why it failed.
 */
export function switchBuildWords(
  org: string,
  from: string,
  item: OrgSwitch,
): { state: string; reason: string } {
  const { build } = item
  switch (build.state) {
    case 'waiting':
      return waitWords(org, build.wait)
    case 'building':
      return {
        state: `Building · ${build.elapsed}`,
        reason: `New workspaces start on ${from} until this build succeeds. Each build has a 60-minute limit.`,
      }
    case 'failed':
      return {
        state: `Failed after ${build.duration}`,
        reason: `${failureLine(item.to, build.failure)} ${org} stays on ${from}, and new workspaces still start there.`,
      }
  }
}

/** The value of the Last switch row. */
export function lastSwitchLine(last: LastSwitch): string {
  return last.by === null
    ? `From ${last.from} on ${last.when}`
    : `From ${last.from} on ${last.when} by @${last.by}`
}

/**
 * The line of the box in place of Switch account when the org has no other
 * configured account. The ID goes in backticks, so the box shows it as
 * code, as the New orgs box of the Providers tab does with one account.
 */
export function onlyAccountSwitchLine(account: string): string {
  return `\`${account}\` is the only configured account.`
}

/** The title of the question before Stop switch. */
export function stopTitle(to: string): string {
  return `Stop the switch to ${to}?`
}

/**
 * The question before Stop switch. The org stays on its account. A switch
 * build that runs stops, and a waiting switch never starts its build.
 */
export function stopQuestion(
  org: string,
  from: string,
  item: OrgSwitch,
): string {
  const stays = `${org} stays on ${from}, and new workspaces still start there.`
  return item.build.state === 'building'
    ? `The switch build on ${item.to} stops. ${stays}`
    : stays
}

/** The paragraph that the Lift question adds while a switch waits for it. */
export function liftSwitchLine(to: string): string {
  return `Lift also starts the switch build on ${to}.`
}
