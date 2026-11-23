import { defineComponent } from '@mokly/mokly'
import { ChecksList } from '../../../components/files/ChecksList'
import { bannerStates } from '../../../../../../src/ui/components/workspace/barModel'

/**
 * The Checks list of the files panel, registered with Mokly. Its pages
 * show failed, running, and passed checks, and a branch without a pull
 * request.
 */
export const checksList = defineComponent({
  slug: 'checks-list',
  title: 'Checks list',
  description:
    'The GitHub checks of the pull request, under its title and a summary with the review state: a mark, the name, and the time of each check, or a spinner while it runs. A branch without a pull request shows an empty state. Its own page shows two failed checks.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: {
      /** The state of the pull request bar, which picks the checks. */
      state: { enum: bannerStates },
    },
  } as const,
  props: { state: 'checks-failed' },
  render: (props) => <ChecksList state={props.state} />,
  variants: [
    {
      slug: 'running',
      title: 'Checks running',
      description: 'Two end-to-end checks still run.',
      props: { state: 'checks-running' },
    },
    {
      slug: 'approved',
      title: 'Approved',
      description: 'Every check passed, and the review approved the change.',
      props: { state: 'ready-to-merge' },
    },
    {
      slug: 'none',
      title: 'No pull request',
      description: 'A branch without a pull request has no checks yet.',
      props: { state: 'none' },
    },
  ],
})
