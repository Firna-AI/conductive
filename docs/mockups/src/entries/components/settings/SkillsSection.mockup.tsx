import { defineComponent } from '@mokly/mokly'
import { SkillsSection } from '../../../components/settings/SkillsSection'
import { skillsRepository } from '../../../fixtures/computer'
import { readOnlyCauseSchema } from './computerSchemas'
import {
  acmeSkillsLookup,
  skillsLookupSchema,
  skillsTrustSchema,
} from './skillsSchemas'

/**
 * The Skills section of the Cloud computer tab, registered with Mokly. Its
 * field is a plain Firna input. The trust switch, the list, the notices,
 * and the read-only details are registered parts.
 */
export const skillsSection = defineComponent({
  slug: 'skills-section',
  title: 'Skills section',
  description:
    'The public GitHub repository whose skills the agents of every workspace of the org use, at the end of the Cloud computer tab. An admin types owner/name or pastes a link from GitHub in the Repository field, sets the trust switch under it, and saves both with Save repository. Under them, the section lists the skills that the lookup of the saved repository found on GitHub, or a notice in place of the list. A member who is not an admin, and everyone in a suspended org, read the saved repository and its trust choice as text. Its own page shows the empty field of an org without a repository, as every org starts.',
  relatedDocs: ['docs/protocol/org-skills.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The saved repository, as owner/name, when the org has one. */
      repository: { type: 'string' },
      lookup: skillsLookupSchema,
      /** The text of the field, when an admin changed it and has not saved. */
      draft: { type: 'string' },
      /** The trust choice, while the field or the saved value names one. */
      trust: skillsTrustSchema,
      readOnly: readOnlyCauseSchema,
    },
  } as const,
  render: (props) => (
    <SkillsSection
      draft={props.draft}
      lookup={props.lookup}
      readOnly={props.readOnly}
      repository={props.repository}
      trust={props.trust}
    />
  ),
  variants: [
    {
      slug: 'chosen',
      title: 'Chosen repository',
      description:
        'acme/agent-skills in the field, with the trust switch off, and the 12 skills that the lookup found under it.',
      props: {
        repository: skillsRepository,
        lookup: acmeSkillsLookup,
        trust: { saved: false },
      },
    },
    {
      slug: 'without-skills',
      title: 'Repository without skills',
      description:
        'A saved repository that holds no skills: a neutral notice in place of the list says where agents look for them.',
      props: {
        repository: skillsRepository,
        lookup: { result: 'found', skills: [] },
        trust: { saved: false },
      },
    },
    {
      slug: 'lookup-failed',
      title: 'List that did not load',
      description:
        'A lookup that did not end, such as in a GitHub outage: the notice of data that did not load names GitHub, with Try again.',
      props: {
        repository: skillsRepository,
        lookup: { result: 'failed' },
        trust: { saved: false },
      },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The saved repository and its trust choice as text, with the hint of that choice and the list, without the field, the switch, and Save.',
      props: {
        repository: skillsRepository,
        lookup: acmeSkillsLookup,
        trust: { saved: false },
        readOnly: 'member',
      },
    },
  ],
})
