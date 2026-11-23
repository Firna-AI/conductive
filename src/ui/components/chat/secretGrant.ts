/**
 * How long the value of a temporary request lasts: 15 minutes in the
 * session that asked, each session of the workspace until Archive, or as
 * a new secret of the org.
 */
export type ValueLifetime = 'minutes' | 'workspace' | 'saved'

/**
 * What lets a run use its secrets: the mark for all agents, a
 * pre-approval of the workspace, an approval of the session, or a value
 * that a member gave.
 */
export type SecretGrant<Person extends string = string> =
  | { kind: 'all-agents' }
  | { kind: 'pre-approved' }
  | { kind: 'session'; by: Person }
  | { kind: 'value'; lifetime: ValueLifetime; by: Person }

/** A grant that a member gave: an approval of the session, or a value. */
export type MemberGrant<Person extends string = string> = Extract<
  SecretGrant<Person>,
  { by: Person }
>
