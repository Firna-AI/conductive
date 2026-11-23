import { defineComponent } from '@mokly/mokly'
import { SkillList } from '../../../../../../src/ui/components/settings/SkillList'
import { agentSkills, cutTreeSkills } from '../../../fixtures/computer'

/**
 * The skills that the lookup found in the saved skills repository,
 * registered with Mokly. The app draws the same part, so its file stays
 * plain.
 */
export const skillList = defineComponent({
  slug: 'skill-list',
  title: 'Skill list',
  description:
    'The skills that the lookup found in the saved skills repository: their number as a label, then the name of each skill folder, in name order. A file tree that GitHub cut short adds a muted note that agents still get all of its skills. Its own page shows the 12 skills of acme/agent-skills.',
  relatedDocs: ['docs/protocol/org-skills-list.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['skills'],
    properties: {
      /** The names of the skill folders, in name order. */
      skills: { type: 'array', items: { type: 'string' } },
      /** GitHub cut the file tree short, so the list can miss skills. */
      incomplete: { type: 'boolean' },
    },
  } as const,
  props: { skills: agentSkills },
  render: (props) => (
    <SkillList incomplete={props.incomplete} skills={props.skills} />
  ),
  variants: [
    {
      slug: 'incomplete',
      title: 'Cut short',
      description:
        'A file tree that GitHub cut short: the skills before the cut, then the note that agents still get all of the skills.',
      props: { skills: cutTreeSkills, incomplete: true },
    },
  ],
})
