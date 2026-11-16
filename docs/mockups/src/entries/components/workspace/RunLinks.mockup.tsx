import { defineComponent } from '@mokly/mokly'
import { RunLinks } from '../../../components/workspace/RunLinks'
import { routines } from '../../../fixtures/routines'
import { pullRequest } from '../../../fixtures/pullRequests'
import { paths } from '../../../paths'

/** The routine of a run workspace and its pull request, as `RunSource`. */
export const runSourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['routine', 'routineTo'],
  properties: {
    routine: { type: 'string' },
    /** The page of the routine in the mockups. */
    routineTo: { type: 'string', minLength: 1 },
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
    'The line under the header of a run workspace, which links to its routine and to the pull request that started the run. A long routine name gives up its room first, and the number of the pull request always shows. Its own page shows a run of Review pull requests for #482.',
  relatedDocs: ['docs/mockups/catalogue-chat-and-routines.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['run'],
    properties: { run: runSourceSchema },
  } as const,
  props: {
    run: {
      routine: routines['review-prs'].name,
      routineTo: paths.routine,
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
          routine: routines['morning-summary'].name,
          routineTo: paths.routineRunNow,
        },
      },
    },
  ],
})
