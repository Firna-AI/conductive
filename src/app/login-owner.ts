import type { MessageSender } from '../shared/generated/MessageSender'
import type { SessionLogin } from '../shared/generated/SessionLogin'
import { personName } from './people'

/**
 * The name of the owner of a login, as every screen names it: the org, such
 * as "Acme", for the org login, or the member, such as "Cal", for the
 * personal login of that member. The label of the composer says "Acme's
 * login", and the line under the prompt of an automation says "Runs use
 * Acme's Claude login". `members` are the people whose names the screen
 * knows, such as the starter of a session or the owner of an automation.
 * Null when the screen does not know the name.
 */
export function loginOwnerName(
  login: SessionLogin,
  orgName: string | null,
  members: readonly MessageSender[],
): string | null {
  if (login.type === 'org') return orgName
  const member = members.find((person) => person.id === login.userId)
  return member ? personName(member) : null
}
