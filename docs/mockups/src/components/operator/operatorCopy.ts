/**
 * The words of the questions and the notices of the operator pages. Each
 * function takes a name as the pages write it: `@login` for a user, and
 * the org name for an org. Every text of an org also takes its deletion,
 * so that no text promises a deleted org what a lift does not give. This
 * module imports no fixture, so the app uses it too.
 */

/**
 * The deletion of an org: the day when everything of it is deleted, as
 * the page writes it, or `null` when the app has no such day.
 */
export type OrgDeletion = { purge: string | null }

/**
 * The user or the org of a question. An org gives its deletion, which is
 * `null` when no admin deleted it.
 */
export type QuestionTarget =
  | { kind: 'user'; name: string }
  | { kind: 'org'; name: string; deletion: OrgDeletion | null }

/** The warning before the operator suspends their own account. */
export const selfSuspendWarning =
  'This is your own account. You will be signed out, and another operator must lift the suspension.'

/** The cost of a suspension for the files of a stopped workspace. */
const lostFiles =
  'A stopped workspace gets no restart near day 14, so its files can be deleted.'

/** What a lift cannot give back. */
const liftFiles =
  'A workspace that stopped 14 days ago or more may have lost its files.'

/**
 * The paragraphs of the question before a suspension: what stops, what
 * the members keep, and what a lift does not bring back. A deleted org
 * keeps nothing that its members can open, and no admin can restore it
 * while it is suspended.
 */
export function suspendQuestion(target: QuestionTarget): readonly string[] {
  const { name } = target
  if (target.kind === 'user') {
    return [
      `${name} is signed out everywhere and cannot sign in. Their workspaces stop, and no member can start them until an admin moves them to another member. Each unfinished build that runs for ${name} stops and fails, and a lift does not bring it back.`,
      `${lostFiles} Lift gives the access back.`,
    ]
  }
  const stops = `Every cloud computer and build of ${name} stops now.`
  const builds = `Each unfinished build of ${name} fails, and a lift does not bring it back.`
  const { deletion } = target
  if (deletion === null) {
    return [
      `${stops} Members can still open and read it, but they cannot change it or start a workspace. ${builds}`,
      `${lostFiles} Lift gives the access back.`,
    ]
  }
  const restore = `No admin can restore ${name} while it is suspended`
  return [
    `${stops} ${builds}`,
    deletion.purge === null
      ? `${restore}.`
      : `${restore}, and everything of it is deleted on ${deletion.purge}.`,
  ]
}

/**
 * The paragraphs of the question before a lift: what comes back, and what
 * may be lost. A deleted org stays deleted, so the question promises it no
 * access.
 */
export function liftQuestion(target: QuestionTarget): readonly string[] {
  const { name } = target
  if (target.kind === 'user') {
    return [
      `${name} can sign in again, and their workspaces can start again.`,
      liftFiles,
    ]
  }
  const { deletion } = target
  if (deletion === null) {
    return [
      `Members can change ${name} again, and its workspaces can start again.`,
      liftFiles,
    ]
  }
  const restore =
    deletion.purge === null
      ? 'An admin can still restore it.'
      : `An admin can restore it until everything of it is deleted on ${deletion.purge}.`
  return [`${name} stays deleted. ${restore}`, liftFiles]
}

/** The title of the notice of a suspension: when, and by which operator. */
export function suspendedTitle(when: string, operator: string | null): string {
  return operator === null
    ? `Suspended on ${when}`
    : `Suspended on ${when} by @${operator}`
}

/**
 * The sentence about the cloud computers whose stop has not finished after
 * a suspension, as its reply names them. It is empty without one.
 */
function stoppingLine(stopping: number): string {
  if (stopping === 0) return ''
  return stopping === 1
    ? '1 cloud computer is still stopping, and it keeps trying on its own.'
    : `${stopping.toLocaleString('en')} cloud computers are still stopping, and each keeps trying on its own.`
}

/**
 * The body of the notice of a suspended org. Members can open and read an
 * org that nobody deleted. A deleted org has no such claim, so its body
 * gives only the stops that have not finished, or nothing.
 */
export function suspendedOrgBody(
  name: string,
  stopping: number,
  deletion: OrgDeletion | null,
): string {
  const stops = stoppingLine(stopping)
  if (deletion !== null) return stops
  const reads = `Members can open and read ${name}, but cannot change it or start a workspace.`
  return stops === '' ? reads : `${reads} ${stops}`
}

/** The body of the notice of a suspended user. */
export function suspendedUserBody(name: string, stopping: number): string {
  const stops = stoppingLine(stopping)
  const body = `${name} cannot sign in, and no member can start the workspaces that ${name} owns. An admin can move them to another member.`
  return stops === '' ? body : `${body} ${stops}`
}

/**
 * The body of the notice of a deleted org, with the day when everything of
 * it is deleted. While the org is suspended, no admin can restore it.
 */
export function deletedOrgBody(
  name: string,
  deletion: OrgDeletion,
  suspended: boolean,
): string {
  if (suspended) {
    return deletion.purge === null
      ? `No admin can restore ${name} before a lift.`
      : `Everything of ${name} is deleted on ${deletion.purge}. No admin can restore it before a lift.`
  }
  return deletion.purge === null
    ? `An admin can still restore ${name}.`
    : `Everything of ${name} is deleted on ${deletion.purge}, unless an admin restores it.`
}
