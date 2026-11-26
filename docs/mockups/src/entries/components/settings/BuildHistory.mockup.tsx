import { defineComponent } from '@mokly/mokly'
import {
  BuildHistory,
  BuildResult,
} from '../../../components/settings/BuildHistory'
import { buildHistory as history, lastBuild } from '../../../fixtures/computer'
import { buildSchema } from './computerSchemas'

/** The failed build of 3 Nov in the history of Acme. */
const failed = history.find((build) => build.result === 'failed') ?? lastBuild

/**
 * The result of a build that ended, registered with Mokly. `id` names the
 * state inside it for Mokly, such as `last` or the time of its build.
 */
export const buildResult = defineComponent({
  slug: 'build-result',
  title: 'Build result',
  description:
    'The result of a build that ended: its length, in green when it succeeded, or in rose with an icon when it failed. Its own page shows the newest good build of Acme.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['build', 'id'],
    properties: {
      build: buildSchema,
      /** The name of the result for Mokly, in kebab-case. */
      id: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { build: lastBuild, id: 'last' },
  render: (props) => <BuildResult build={props.build} id={props.id} />,
  variants: [
    {
      slug: 'failed',
      title: 'Failed',
      description: 'A build that failed, with the time until it failed.',
      props: { build: failed },
    },
  ],
})

/** The builds of the computer that ended, registered with Mokly. */
export const buildHistory = defineComponent({
  slug: 'build-history',
  title: 'Build history',
  description:
    'The builds of the cloud computer that ended, newest first, in a fold with their count: each build with its time and its result. It shows once a build has ended. Its own page shows the open history of Acme.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['builds', 'open'],
    properties: {
      builds: { type: 'array', items: buildSchema },
      open: { type: 'boolean' },
    },
  } as const,
  props: { builds: history, open: true },
  render: (props) => <BuildHistory builds={props.builds} open={props.open} />,
  variants: [
    {
      slug: 'closed',
      title: 'Closed',
      description:
        'The closed fold, as while a saved change waits for a build.',
      props: { open: false },
    },
  ],
})
