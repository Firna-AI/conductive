import { defineComponent } from '@mokly/mokly'
import { RunLinks } from '../../../components/workspace/RunLinks'
import { automations } from '../../../fixtures/automations'
import { pullRequest } from '../../../fixtures/pullRequests'
import { paths } from '../../../paths'

/** The automation of a run workspace and its pull request, as `RunSource`. */
export const runSourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['automation', 'automationTo'],
  properties: {
    automation: { type: 'string' },
    /** The page of the automation in the mockups. */
    automationTo: { type: 'string', minLength: 1 },
    pullRequest: {
      type: 'object',
      additionalProperties: false,
      required: ['number', 'url'],
      properties: {
        number: { type: 'integer', minimum: 1 },
        url: { type: 'string', minLength: 1 },
      },
    },
  },
} as const

/** The line under the header of a run workspace, registered with Mokly. */
export const runLinks = defineComponent({
  slug: 'run-links',
  title: 'Run links',
  description:
    'The line under the header of a run workspace, which links to its automation and to the pull request that started the run. A long automation name gives up its room first, and the number of the pull request always shows. Its own page shows a run of Review pull requests for #482.',
  relatedDocs: ['docs/mockups/catalogue-chat-and-automations.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['run'],
    properties: { run: runSourceSchema },
  } as const,
  props: {
    run: {
      automation: automations['review-prs'].name,
      automationTo: paths.automation,
      pullRequest: { number: pullRequest.number, url: pullRequest.url },
    },
  },
  render: (props) => <RunLinks run={props.run} />,
  variants: [
    {
      slug: 'run-now',
      title: 'Run now',
      description: 'A run that Run now started, without a pull request.',
      props: {
        run: {
          automation: automations['morning-summary'].name,
          automationTo: paths.automationRunNow,
        },
      },
    },
  ],
})
