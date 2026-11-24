import { expect, test } from 'vitest'
import { routeOf } from '../../../app/navigation'
import { skillHref, skillPlace } from './skill-address'

/** The skill that an address of the workspace names, as the shell reads it. */
function skillAt(href: string) {
  const route = routeOf(href)
  return route.screen === 'workspace' ? skillPlace(route.view) : null
}

test('the address of a skill tab names its agent and its name, also a name with a slash, and an address that a person types with that slash', () => {
  const plans = { agent: 'codex', name: 'plans/v2' } as const
  const href = skillHref('acme', 'checkout', plans)
  expect({
    href,
    read: skillAt(href),
    typed: skillAt('/orgs/acme/workspaces/checkout/skills/codex/plans/v2'),
  }).toEqual({
    href: '/orgs/acme/workspaces/checkout/skills/codex/plans%2Fv2',
    read: plans,
    typed: plans,
  })
})

test('an address with another agent, no name, or a name with white space names no skill', () => {
  expect(
    [
      '/orgs/acme/workspaces/checkout/skills/gemini/plans',
      '/orgs/acme/workspaces/checkout/skills/claude',
      '/orgs/acme/workspaces/checkout/skills/claude/two%20words',
      '/orgs/acme/workspaces/checkout/files/claude/plans',
    ].map(skillAt),
  ).toEqual([null, null, null, null])
})
