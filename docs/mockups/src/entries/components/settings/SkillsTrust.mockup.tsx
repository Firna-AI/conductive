import { defineComponent } from '@mokly/mokly'
import {
  SavedTrustHint,
  TrustSwitch,
} from '../../../components/settings/SkillsTrust'

/**
 * The trust switch of an admin under the Repository field of the Skills
 * section, registered with Mokly. Its link to the guide is a registered
 * part too.
 */
export const trustSwitch = defineComponent({
  slug: 'trust-switch',
  title: 'Trust switch',
  description:
    'The switch "Trust this skills repository" of an admin, under the Repository field of the Skills section. Its hint says what the choice does, that running cloud computers keep their current trust until their next start or resume, and ends with How trust works, which opens the guide. It starts off for each new repository. Its own page shows it off.',
  relatedDocs: ['docs/protocol/org-skills-trust.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['trusted', 'replaced'],
    properties: {
      /** The choice of the form: on or off. */
      trusted: { type: 'boolean' },
      /** The field names another repository than the saved one. */
      replaced: { type: 'boolean' },
    },
  } as const,
  props: { trusted: false, replaced: false },
  render: (props) => (
    <TrustSwitch replaced={props.replaced} trusted={props.trusted} />
  ),
  variants: [
    {
      slug: 'on',
      title: 'Trusted',
      description:
        'The switch on: Claude can run automatic commands from the skills of the repository.',
      props: { trusted: true },
    },
    {
      slug: 'replaced',
      title: 'Another repository',
      description:
        'The field names another repository than the saved one, so the switch is off, and the hint first says that a new repository starts untrusted.',
      props: { replaced: true },
    },
  ],
})

/**
 * What the saved trust choice does, under the read-only details of the
 * Skills section, registered with Mokly.
 */
export const savedTrustHint = defineComponent({
  slug: 'saved-trust-hint',
  title: 'Saved trust hint',
  description:
    'What the saved trust choice of the skills repository does, under the read-only details that a member and everyone in a suspended org read, with the note on running cloud computers and How trust works. Its own page shows the hint of a repository that is not trusted.',
  relatedDocs: ['docs/protocol/org-skills-trust.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['trusted'],
    properties: {
      /** The saved choice: trusted or not. */
      trusted: { type: 'boolean' },
    },
  } as const,
  props: { trusted: false },
  render: (props) => <SavedTrustHint trusted={props.trusted} />,
  variants: [
    {
      slug: 'trusted',
      title: 'Trusted',
      description: 'The hint of a trusted repository.',
      props: { trusted: true },
    },
  ],
})
