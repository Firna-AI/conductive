import { defineComponent } from '@mokly/mokly'
import {
  AgentsSection,
  GitHubSection,
  SignInSection,
} from '../../../components/settings/AccountSections'
import { accountLogins } from '../../../fixtures/logins'
import { acmeLoginUse } from '../../../fixtures/orgLogins'
import { agentListProperties, loginSharesSchema } from './loginSchemas'

/** The share settings of the account, with no change that failed. */
const shares = { notSaved: null }

/** The person signed in with GitHub, registered with Mokly. */
export const signInSection = defineComponent({
  slug: 'sign-in-section',
  title: 'Sign-in section',
  description:
    'The person signed in with GitHub, at the top of the General tab of the account: the avatar, the GitHub login, and Sign out.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <SignInSection />,
})

/** The shared GitHub App, registered with Mokly. */
export const gitHubSection = defineComponent({
  slug: 'github-section',
  title: 'GitHub section',
  description:
    'The shared GitHub App on the General tab of the account: Connected with the accounts where it is installed and the count of their repositories, and Manage on GitHub. Before an install, it offers Install the GitHub App. Its own page shows the connected app.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['connected'],
    properties: { connected: { type: 'boolean' } },
  } as const,
  props: { connected: true },
  render: (props) => <GitHubSection connected={props.connected} />,
  variants: [
    {
      slug: 'not-connected',
      title: 'Not installed',
      description: 'The app before an install: Install the GitHub App.',
      props: { connected: false },
    },
  ],
})

/** The Agents section of the account, registered with Mokly. */
export const agentsSection = defineComponent({
  slug: 'agents-section',
  title: 'Agents section',
  description:
    'The agents that every org uses, Claude and Codex, on the Agents tab of the account: each connected login with its kind, Remove, and its share setting, or Connect. Under an agent, a line names each org whose org login serves the new sessions of the person. Its own page shows both agents connected.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['logins', 'shares'],
    properties: { ...agentListProperties, shares: loginSharesSchema },
  } as const,
  props: { logins: accountLogins, shares },
  render: (props) => (
    <AgentsSection
      form={props.form}
      logins={props.logins}
      orgLogins={props.orgLogins}
      shares={props.shares}
      unusable={props.unusable}
    />
  ),
  variants: [
    {
      slug: 'not-saved',
      title: 'Share not saved',
      description:
        'A change of the share setting of Claude that the app did not save.',
      props: { shares: { notSaved: 'claude' } },
    },
    {
      slug: 'org-login',
      title: 'Org login in use',
      description:
        "Cal has no Claude login of his own, so the line under Claude says that his new sessions in Acme use Acme's login.",
      props: {
        logins: { codex: accountLogins.codex },
        orgLogins: acmeLoginUse(),
      },
    },
  ],
})
