import { defineComponent } from '@mokly/mokly'
import { firstBuildStates } from '../../../fixtures/computer'
import { OrgBuild } from '../../../screens/getStartedBuild'

/** The first build of the org in Get started, registered with Mokly. */
export const orgBuild = defineComponent({
  slug: 'org-build',
  title: 'Org build',
  description:
    'The cloud computer of the new org, under its name in the org step of Get started: the first build with its time, then ready, the failure with the message that the app saved for the build, or no build, such as after a start that failed. Its own page shows the first build while it runs.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['build'],
    properties: {
      /** The first build of the cloud computer of the org. */
      build: { enum: firstBuildStates },
    },
  } as const,
  props: { build: 'running' },
  render: (props) => <OrgBuild build={props.build} />,
  variants: [
    {
      slug: 'succeeded',
      title: 'Ready',
      description: 'The first build succeeded: the computer is ready.',
      props: { build: 'succeeded' },
    },
    {
      slug: 'failed',
      title: 'Failed',
      description:
        'The first build failed: its time, and the message that the app saved.',
      props: { build: 'failed' },
    },
    {
      slug: 'none',
      title: 'No build',
      description: 'No build runs, such as after a start that failed.',
      props: { build: 'none' },
    },
  ],
})
