import { expect, it } from 'vitest'
import type { ToolCall } from '../chat-events'
import { foldSkillLabel, foldSkills, toolEnding, toolVerb } from './tool-words'

const call: ToolCall = {
  id: 'skill',
  kind: 'run',
  target: 'brainstorming',
  detail: null,
  omittedDetailBytes: 0,
  state: 'done',
}

it('uses singular and plural skill verbs and the usual failed and stopped endings', () => {
  const cases: readonly {
    state: ToolCall['state']
    skills: readonly string[]
    verb: string
    ending: string | undefined
  }[] = [
    {
      state: 'running',
      skills: ['plans'],
      verb: 'Using skill',
      ending: undefined,
    },
    { state: 'done', skills: ['plans'], verb: 'Used skill', ending: undefined },
    {
      state: 'running',
      skills: ['plans', 'testing'],
      verb: 'Using skills',
      ending: undefined,
    },
    {
      state: 'done',
      skills: ['plans', 'testing'],
      verb: 'Used skills',
      ending: undefined,
    },
    {
      state: 'failed',
      skills: ['plans'],
      verb: 'Used skill',
      ending: 'Failed',
    },
    {
      state: 'stopped',
      skills: ['plans', 'testing'],
      verb: 'Used skills',
      ending: 'Stopped',
    },
  ]
  for (const { state, skills, verb, ending } of cases) {
    const skill = { ...call, state, skills }
    expect([toolVerb(skill), toolEnding(skill)], `${state}: ${skills}`).toEqual(
      [verb, ending],
    )
  }
  expect(toolVerb(call)).toBe('Ran')
})

it('names each fold skill once in first-use order without failed or stopped calls', () => {
  const calls: readonly ToolCall[] = [
    { ...call, skills: ['failed-only', 'plans'], state: 'failed' },
    { ...call, skills: ['brainstorming', 'plans'] },
    {
      ...call,
      skills: ['stopped-only', 'conductor:conductor'],
      state: 'stopped',
    },
    { ...call, skills: ['plans', 'conductor:conductor'], state: 'running' },
    call,
  ]
  expect(foldSkills(calls)).toEqual([
    'brainstorming',
    'plans',
    'conductor:conductor',
  ])
})

it('gives singular, plural, or absent text for the skill names of a fold', () => {
  expect(foldSkillLabel([{ ...call, skills: ['brainstorming'] }])).toBe(
    'Skill: brainstorming',
  )
  expect(
    foldSkillLabel([{ ...call, skills: ['brainstorming', 'plans'] }]),
  ).toBe('Skills: brainstorming, plans')
  expect(foldSkillLabel([call])).toBe('')
})
