import { defineComponent } from '@mokly/mokly'
import { ContinuedLine } from '../../../../../../src/ui/components/chat/ContinuedLine'
import { continuedBranch, promptFacts } from '../../../fixtures/barActions'

/**
 * The note of Continue in a session, registered with Mokly. The app draws
 * the same line, so mockup-only parts render the wrapper and the parts
 * that the app reaches keep the plain part.
 */
export const continuedLine = defineComponent({
  slug: 'continued-line',
  title: 'Continued line',
  description:
    'The note of Continue at its place in a session: who pressed Continue, the new branch of the workspace in code type, and its base. It says "You" to the member who pressed it. Its own page shows the note of that member.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['who', 'branch', 'base'],
    properties: {
      /** Who pressed Continue: "You" for that member. */
      who: { type: 'string' },
      branch: { type: 'string' },
      base: { type: 'string' },
    },
  } as const,
  props: { who: 'You', branch: continuedBranch, base: promptFacts.base },
  render: (props) => (
    <ContinuedLine base={props.base} branch={props.branch} who={props.who} />
  ),
})
