import { defineComponent } from '@mokly/mokly'
import { BuildSection } from '../../../components/settings/BuildSection'
import {
  acmeBuilds,
  buildStateSchema,
  newOrgBuilds,
  orgBuildsSchema,
} from './computerSchemas'

/** The builds of the cloud computer of an org, registered with Mokly. */
export const buildSection = defineComponent({
  slug: 'build-section',
  title: 'Build section',
  description:
    'The builds of the cloud computer of an org: the last build with its result, Build computer, the log of a build that runs or failed, and the history of the builds that ended. A failed build leaves the last good build in use. An org with no build shows Build computer first. A member who is not an admin gets no action. Its own page shows the builds of Acme.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state', 'builds'],
    properties: {
      state: buildStateSchema,
      builds: orgBuildsSchema,
      /** No actions, for a member who is not an admin. */
      readOnly: { type: 'boolean' },
      /** A saved change waits for a build, so the history stays closed. */
      changeWaits: { type: 'boolean' },
      /** A refresh that runs, after a good build or a failed build. */
      refresh: { enum: ['running', 'requested'] },
    },
  } as const,
  props: { state: 'ready', builds: acmeBuilds },
  render: (props) => (
    <BuildSection
      builds={props.builds}
      changeWaits={props.changeWaits}
      readOnly={props.readOnly}
      refresh={props.refresh}
      state={props.state}
    />
  ),
  variants: [
    {
      slug: 'building',
      title: 'Building',
      description:
        'A build that runs: its time, its live log, and the build that workspaces start from until it finishes.',
      props: { state: 'building' },
    },
    {
      slug: 'refreshing',
      title: 'Refreshing',
      description:
        'A refresh that runs after a good build, such as after a push. A refresh only fetches commits, so Build computer stays on.',
      props: { refresh: 'running' },
    },
    {
      slug: 'refreshing-requested',
      title: 'Refreshing, build requested',
      description:
        'An admin selected Build computer while a refresh ran, after a change of the install script. The build starts when the refresh ends.',
      props: { refresh: 'requested', changeWaits: true },
    },
    {
      slug: 'failed',
      title: 'Failed',
      description:
        'A failed build: its saved message above the end of its log, Try again, and the good build that workspaces still start from.',
      props: { state: 'failed' },
    },
    {
      slug: 'failed-requested',
      title: 'Failed, build requested',
      description:
        'A failed build while a refresh runs, after an admin selected Try again. The card keeps the failed build, and a build starts when the refresh ends.',
      props: { state: 'failed', refresh: 'requested' },
    },
    {
      slug: 'none',
      title: 'No build',
      description:
        'A new org whose first build did not start: Build computer comes first.',
      props: { state: 'none', builds: newOrgBuilds },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description: 'The builds without Build computer, for a member.',
      props: { readOnly: true },
    },
  ],
})
