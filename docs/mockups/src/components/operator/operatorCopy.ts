/**
 * The words of the questions and the notices of the operator pages. Each
 * function takes a name as the pages write it: `@login` for a user, and
 * the org name for an org. This module imports no fixture, so the app uses
 * it too.
 */

/** The kind of the target of a page. */
export type TargetKind = 'user' | 'org'

/** What a suspension stops, and what the members keep. */
export function suspendStops(kind: TargetKind, name: string): string {
  return kind === 'user'
    ? `${name} is signed out everywhere and cannot sign in. Their workspaces stop, and no member can start them until an admin moves them to another member.`
    : `Every cloud computer and build of ${name} stops now. Members can still open and read it, but they cannot change it or start a workspace.`
}

/** The cost of a suspension, and the way back. */
export const suspendFiles =
  'A stopped workspace gets no restart near day 14, so its files can be deleted. Lift gives the access back.'

/** The warning before the operator suspends their own account. */
export const selfSuspendWarning =
  'This is your own account. You will be signed out, and another operator must lift the suspension.'

/** What a lift gives back. */
export function liftGivesBack(kind: TargetKind, name: string): string {
  return kind === 'user'
    ? `${name} can sign in again, and their workspaces can start again.`
    : `Members can change ${name} again, and its workspaces can start again.`
}

/** What a lift cannot give back. */
export const liftFiles =
  'A workspace that stopped 14 days ago or more may have lost its files.'

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
    ? ' 1 cloud computer is still stopping, and it keeps trying on its own.'
    : ` ${stopping.toLocaleString('en')} cloud computers are still stopping, and each keeps trying on its own.`
}

/** The body of the notice of a suspended org. */
export function suspendedOrgBody(name: string, stopping: number): string {
  return `Members can open and read ${name}, but cannot change it or start a workspace.${stoppingLine(stopping)}`
}

/** The body of the notice of a suspended user. */
export function suspendedUserBody(name: string, stopping: number): string {
  return `${name} cannot sign in, and no member can start the workspaces that ${name} owns. An admin can move them to another member.${stoppingLine(stopping)}`
}

/** The body of the notice of a deleted org, with the day when it goes. */
export function deletedOrgBody(name: string, purge: string | null): string {
  return purge === null
    ? `An admin can still restore ${name}.`
    : `Everything of ${name} is deleted on ${purge}, unless an admin restores it.`
}
