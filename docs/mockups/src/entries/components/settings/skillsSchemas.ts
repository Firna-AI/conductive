import type { SkillsLookup } from '../../../../../../src/ui/components/settings/skillsCopy'
import { agentSkills } from '../../../fixtures/computer'

/** Why a saved repository gives no list, as the other results of `SkillsLookup`. */
const noListResults = [
  'private',
  'not-found',
  'failed',
] as const satisfies readonly Exclude<SkillsLookup['result'], 'found'>[]

/**
 * What the lookup of the saved repository found on GitHub, as
 * `SkillsLookup`: the names of its skill folders in name order, with
 * `incomplete` when GitHub cut the file tree short, or why it gave no list.
 */
export const skillsLookupSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['result', 'skills'],
      properties: {
        result: { const: 'found' },
        skills: { type: 'array', items: { type: 'string' } },
        incomplete: { type: 'boolean' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['result'],
      properties: { result: { enum: noListResults } },
    },
  ],
} as const

/**
 * The trust choice of the repository that the Skills section names, as
 * `SkillsTrust`: the saved choice, and the choice of the form while an
 * admin has not saved a change.
 */
export const skillsTrustSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['saved'],
  properties: {
    saved: { type: 'boolean' },
    draft: { type: 'boolean' },
  },
} as const

/** What the lookup of acme/agent-skills finds: its 12 skills. */
export const acmeSkillsLookup = {
  result: 'found',
  skills: agentSkills,
} as const satisfies SkillsLookup
