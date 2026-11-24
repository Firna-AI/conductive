import { defineComponent } from '@mokly/mokly'
import {
  SkillPage,
  type SkillTabView,
} from '../../../components/files/SkillPage'
import { agentKeys } from '../../../fixtures/agents'
import { paths } from '../../../paths'
import { inPlace, placeHeightSchema } from '../common/ownPages'

/** The views of a skill tab, as `SkillTabView` lists them. */
const skillTabViews = [
  'preview',
  'source',
  'loading',
  'gone',
  'too-large',
  'older-software',
] as const satisfies readonly SkillTabView[]

/**
 * A skill as a full page, registered with Mokly: the tab of a skill in the
 * centre column on desktop, and a page of the Files tab on a phone. A
 * screen supplies the state of a sandbox that takes the place of the text.
 * The page fills the height of its tab, so its own pages give it a place
 * of a fixed height.
 */
export const skillPage = defineComponent({
  slug: 'skill-page',
  title: 'Skill page',
  description:
    'A skill as a full page. The header shows the skill icon and the name of the skill in a quiet chip, then the agent of the skill, such as "Claude skill", and under them its description, muted, in at most three lines. The switch between Preview and Source ends the first line. Preview shows the Markdown body without the front matter, and Source shows the whole text with line numbers and its line count. A notice can take the place of the text. On a phone the page leads back to All files. Its own page shows the Preview of plans.',
  relatedDocs: ['docs/mockups/catalogue-workspace-tools.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['view', 'agent'],
    properties: {
      view: { enum: skillTabViews },
      /** The agent of the skill, which the header names after the name. */
      agent: { enum: agentKeys },
      /** The way back to All files, on a phone. */
      back: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'to'],
        properties: {
          label: { type: 'string' },
          to: { type: 'string', minLength: 1 },
        },
      },
      placeHeight: placeHeightSchema,
    },
  } as const,
  slots: ['placeholder'],
  props: { view: 'preview', agent: 'claude', placeHeight: 560 },
  render: (props) =>
    inPlace(
      <SkillPage
        agent={props.agent}
        back={props.back}
        placeholder={props.placeholder}
        view={props.view}
      />,
      props.placeHeight,
    ),
  variants: [
    {
      slug: 'source',
      title: 'Source',
      description:
        'The whole SKILL.md of plans, with its front matter, line numbers, and its line count in the header.',
      props: { view: 'source' },
    },
    {
      slug: 'loading',
      title: 'Loading',
      description: 'A spinner and "Opening the skill" while the read runs.',
      props: { view: 'loading' },
    },
    {
      slug: 'gone',
      title: 'Removed or renamed',
      description:
        'The list no longer holds the skill, so the header has no description, and a notice takes the place of the text.',
      props: { view: 'gone' },
    },
    {
      slug: 'phone',
      title: 'On a phone',
      description:
        'The Preview of plans as a page of the Files tab, which leads back to All files.',
      props: { back: { label: 'All files', to: paths.filesAll } },
    },
  ],
})
