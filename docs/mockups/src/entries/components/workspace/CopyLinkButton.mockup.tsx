import { defineComponent } from '@mokly/mokly'
import {
  CopyLinkButton,
  type CopyResult,
} from '../../../../../../src/ui/components/workspace/CopyLinkButton'
import { workspaceLabel } from '../../../../../../src/ui/components/workspaces/label'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { noop } from '../../../../../../src/ui/noop'

/** The results of a copy, as `CopyResult` lists them. */
const copyResults = [
  'copied',
  'failed',
] as const satisfies readonly CopyResult[]

/**
 * The label of the workspace number that copies its link, registered with
 * Mokly. Its pages show the button, both results of a press, and the
 * button in the line under the name of a phone header.
 */
export const copyLinkButton = defineComponent({
  slug: 'copy-link-button',
  title: 'Copy link button',
  description:
    'The label of the workspace number, such as W-395, as a plain button that copies the web address of the workspace. After a press, a note under the button gives the result for a moment: Link copied, or a request to try again in the danger colour. Its own page shows the button of the desktop header.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label'],
    properties: {
      /** The label of the number, such as `W-395`. */
      label: { type: 'string' },
      /** The result of the last press, while the button shows it. */
      result: { enum: copyResults },
      /** The button sits in the line under the name, as on a phone. */
      inline: { type: 'boolean' },
    },
  } as const,
  props: { label: workspaceLabel(checkoutAutocomplete.number) },
  render: (props) => (
    <CopyLinkButton
      inline={props.inline}
      label={props.label}
      onPress={noop}
      result={props.result}
    />
  ),
  variants: [
    {
      slug: 'copied',
      title: 'Link copied',
      description: 'The note after a copy that worked.',
      props: { result: 'copied' },
    },
    {
      slug: 'failed',
      title: "Link didn't copy",
      description: 'The note after a copy that failed, in the danger colour.',
      props: { result: 'failed' },
    },
    {
      slug: 'inline',
      title: 'In the line of a phone',
      description:
        'The button in the line under the name of a phone header, with its taller touch area.',
      props: { inline: true },
    },
  ],
})
