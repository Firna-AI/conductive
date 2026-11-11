import { expect, it } from 'vitest'
import { context } from './runner-fixtures.test-support'
import { createRunnerLimitsFixture } from './runner-limits.test-support'

const tool = {
  id: 'load-skills',
  kind: 'run',
  target: 'brainstorming, conductor:conductor',
  detail: 'cat SKILL.md',
  omittedDetailBytes: 0,
  state: 'done',
}

it('stores skill names in order and ignores malformed skill values without refusing events', async () => {
  const fixture = await createRunnerLimitsFixture()
  const values: readonly unknown[] = [
    ['brainstorming', 'conductor:conductor'],
    ['', 7, ' plans ', null, 'brainstorming'],
    'plans',
    ['', 7, null],
    undefined,
  ]
  const stored: unknown[] = []
  for (const [index, skills] of values.entries()) {
    await fixture.receive(index + 1, {
      ...context,
      type: 'tool.updated',
      tool: { ...tool, skills },
    })
    stored.push((await fixture.history()).events.at(-1)?.event)
  }
  expect(stored).toEqual([
    {
      ...context,
      type: 'tool.updated',
      tool: { ...tool, skills: ['brainstorming', 'conductor:conductor'] },
    },
    {
      ...context,
      type: 'tool.updated',
      tool: { ...tool, skills: [' plans ', 'brainstorming'] },
    },
    { ...context, type: 'tool.updated', tool },
    { ...context, type: 'tool.updated', tool },
    { ...context, type: 'tool.updated', tool },
  ])
})
