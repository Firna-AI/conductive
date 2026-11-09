import { defineScreen } from '@mokly/mokly'
import {
  GetStartedScreen,
  getStartedSchema,
} from '../../../../screens/GetStartedScreen'

const join = ['user-flows/join']

export const getStarted = defineScreen({
  title: 'Get started',
  description:
    'The only first run, once the person has app access, in three steps: install the GitHub App on the account that owns the repositories, create an org, and connect Claude or Codex. Create org waits for the install. A person with no org comes here too.',
  rationale:
    'A GitHub App user token reaches only what both the user and the app can reach, so a new user must install the app before an org can list repositories. The steps are numbered, so the order is clear without a note. Install the GitHub App opens GitHub, which returns here when the install is done. The user chose option D of decision 33: the first run connects an agent, and the composer asks for one when it is missing. The app runs every cloud computer on its own account, so the first run asks for no key and no other account, as the user chose in decision 80. Get started opens only after app access, because its steps need it: a person without app access sees app/sign-in/waitlist instead.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: { step: 'install', agent: 'none', person: 'cal' },
  useCasePaths: join,
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'installed',
      title: 'GitHub App installed',
      description:
        'Back from GitHub: the app is installed on firna with its 3 repositories. Create org is the next step.',
      props: { step: 'org' },
      useCasePaths: join,
    },
    {
      slug: 'org-created',
      title: 'Org created',
      description:
        'Firna exists, and the rail shows it. The form of Claude is open, because the default model is a Claude model. Codex can follow at any time.',
      props: { step: 'done' },
      useCasePaths: join,
    },
    {
      slug: 'connected',
      title: 'Agent connected',
      description:
        'Claude is connected with a subscription token, so every step is done. Open Firna leads to the new org.',
      props: { step: 'done', agent: 'connected' },
      useCasePaths: join,
    },
    {
      slug: 'no-org',
      title: 'No org, agent connected',
      description:
        'Priya left Acme, the last org, in app/orgs/suspended/leave/confirm. Claude is still connected, because a login belongs to the person. Create org is the next step, and the rail shows no org.',
      rationale:
        'The words name the steps that remain. They make no claim about earlier use, so they hold for a new person and for a person who returns with no org.',
      props: { step: 'org', agent: 'connected', person: 'priya' },
    },
  ],
})
