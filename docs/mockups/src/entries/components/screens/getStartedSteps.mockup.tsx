import { defineComponent } from '@mokly/mokly'
import { firstBuildStates } from '../../../fixtures/computer'
import {
  AgentStep,
  agentStates,
  getStartedPeople,
  getStartedSteps,
  InstallStep,
  OrgStep,
} from '../../../screens/getStartedSteps'

/** The next of the first two steps of Get started, or `done` after both. */
const stepSchema = { enum: getStartedSteps } as const

/** The first build of the cloud computer of the new org. */
const buildSchema = { enum: firstBuildStates } as const

/** The GitHub App step of Get started, registered with Mokly. */
export const installStep = defineComponent({
  slug: 'install-step',
  title: 'Install step',
  description:
    'The GitHub App step of Get started: Install the GitHub App while it is the next step, then Done with the account where the person installed it, and Install on another account. Its own page shows the step as the next one for Cal.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['step', 'person'],
    properties: {
      step: stepSchema,
      /** The person signed in, with the installation that they reach. */
      person: { enum: getStartedPeople },
    },
  } as const,
  props: { step: 'install', person: 'cal' },
  render: (props) => <InstallStep person={props.person} step={props.step} />,
  variants: [
    {
      slug: 'done',
      title: 'Done',
      description: 'The installed app, with the account and its repositories.',
      props: { step: 'org' },
    },
  ],
})

/** The org step of Get started, registered with Mokly. */
export const orgStep = defineComponent({
  slug: 'org-step',
  title: 'Org step',
  description:
    'The org step of Get started: Create org, which stays off until the GitHub App is installed. Once the org exists, the step shows its repositories and its first build, with Try again and the log after a failure. Its own page shows Create org as the next step.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['step', 'build'],
    properties: { step: stepSchema, build: buildSchema },
  } as const,
  props: { step: 'org', build: 'running' },
  render: (props) => <OrgStep build={props.build} step={props.step} />,
  variants: [
    {
      slug: 'waiting',
      title: 'Not yet',
      description: 'The step before the GitHub App: Create org is off.',
      props: { step: 'install' },
    },
    {
      slug: 'building',
      title: 'First build',
      description: 'The org exists, and its first build runs.',
      props: { step: 'done' },
    },
    {
      slug: 'failed',
      title: 'Build failed',
      description:
        'The first build failed: its message, Try again, and the log.',
      props: { step: 'done', build: 'failed' },
    },
  ],
})

/** The agent step of Get started, registered with Mokly. */
export const agentStep = defineComponent({
  slug: 'agent-step',
  title: 'Agent step',
  description:
    'The agent step of Get started: Connect Claude or Codex. A connected agent can come before the org. When the step is next, the form of Claude opens. Its own page shows the step before the org exists.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['step', 'agent', 'build'],
    properties: {
      step: stepSchema,
      /** An agent is connected. */
      agent: { enum: agentStates },
      build: buildSchema,
    },
  } as const,
  props: { step: 'install', agent: 'none', build: 'running' },
  render: (props) => (
    <AgentStep agent={props.agent} build={props.build} step={props.step} />
  ),
  variants: [
    {
      slug: 'next',
      title: 'Next step',
      description: 'The last step, with the form of Claude open.',
      props: { step: 'done' },
    },
    {
      slug: 'connected',
      title: 'Connected',
      description: 'Claude connected with a subscription token: Done.',
      props: { step: 'done', agent: 'connected' },
    },
  ],
})
