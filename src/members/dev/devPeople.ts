import type { User } from '../../shared/api'
import type { MembersResponse, OrgMember } from '../../shared/members'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'

/** Names for the long member list of the dev page's menu lab. */
const names = [
  'Ada Brooks',
  'Ben Okafor',
  'Chloe Martin',
  'Dev Patel',
  'Elena Rossi',
  'Femi Adeyemi',
  'Grace Kim',
  'Hugo Lambert',
  'Isla Novak',
  'Jonah Weiss',
  'Kai Tanaka',
  'Lena Fischer',
  'Marco Silva',
  'Nina Petrova',
  'Omar Haddad',
  'Paula Costa',
  'Quinn Murphy',
  'Rosa Alvarez',
  'Sami Virtanen',
  'Tara Singh',
  'Ugo Bianchi',
  'Vera Lindqvist',
  'Wen Li',
  'Ximena Ruiz',
  'Yusuf Demir',
  'Zoe Carter',
  'Arjun Mehta',
  'Bianca Moreau',
  'Caleb Wright',
  'Daria Ivanova',
  'Emil Larsen',
  'Farah Aziz',
  'Gael Dubois',
  'Hana Sato',
  'Ivan Horvat',
  'Julia Becker',
  'Kofi Mensah',
  'Lucia Romero',
  'Mateo Garcia',
] as const

function person(name: string, index: number): User {
  const login = name.toLowerCase().replace(' ', '')
  return {
    id: `person-${index}`,
    githubId: 100 + index,
    githubLogin: login,
    displayName: name,
    avatarUrl: null,
  }
}

/**
 * The members of Acme for the menu lab: Cal, the admin, and then up to 39
 * other people, so a long owner menu can be checked in a real browser.
 */
export function devPeople(count: number): MembersResponse {
  const cal = coreFixtures().members.members[0]
  const others = names
    .slice(0, Math.max(0, count - 1))
    .map((name, index): OrgMember => ({
      user: person(name, index + 2),
      role: 'member',
      joinedAt: FAKE_TIME - (index + 2) * 86_400_000,
    }))
  return { members: [cal, ...others], invites: [] }
}
