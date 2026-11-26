import { defineComponent } from '@mokly/mokly'
import { GitHubMark } from '../../../../../../src/ui/components/common/GitHubMark'

/**
 * The GitHub mark, registered with Mokly. A call can place it with a class
 * of its own, such as a margin.
 */
export const githubMark = defineComponent({
  slug: 'github-mark',
  title: 'GitHub mark',
  description:
    'The GitHub mark, for actions that go to GitHub, such as sign-in. It takes the colour of the text around it. Its own page shows it at 16 px.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['size'],
    properties: {
      /** The side of the mark, in px. */
      size: { type: 'number', minimum: 1 },
      /** A class of the call that places the mark. */
      className: { type: 'string' },
    },
  } as const,
  props: { size: 16 },
  render: (props) => (
    <GitHubMark className={props.className} size={props.size} />
  ),
})
