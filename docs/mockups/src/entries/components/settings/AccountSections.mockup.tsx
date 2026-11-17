import { defineComponent } from '@mokly/mokly'
import {
  AgentList,
  AgentsSection,
  GitHubSection,
  SignInSection,
} from '../../../components/settings/AccountSections'
import {
  accountLogins,
  codexUnusableCause,
  unlistedModelLogins,
} from '../../../fixtures/logins'
import { paths } from '../../../paths'
import {
  agentLoginsSchema,
  loginSharesSchema,
  openAgentFormSchema,
  unusableLoginSchema,
} from './loginSchemas'

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

/** The data of the list of the agents, as the props of `AgentList`. */
const agentListProperties = {
  logins: agentLoginsSchema,
  /** The Connect form that is open under the row of an agent. */
  form: openAgentFormSchema,
  /** A login that the app can no longer use. */
  unusable: unusableLoginSchema,
} as const

/** Claude and Codex, each with Connect or its login, registered with Mokly. */
export const agentList = defineComponent({
  slug: 'agent-list',
  title: 'Agent list',
  description:
    'Claude and Codex, each with Connect, or Connected and the kind of its login. An own endpoint login shows its host and the lines of its model list under its row. Connect opens the form of the agent under its row. On the account, each login has Remove and its share setting. A login that the app can no longer use says Signed out, with its cause and Sign in again. Its own page shows both agents connected, as on the account.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['logins'],
    properties: {
      ...agentListProperties,
      /** Each connected login has Remove, as on the account. */
      removable: { type: 'boolean' },
      /** Each connected login has its share setting, as on the account. */
      shares: loginSharesSchema,
    },
  } as const,
  props: { logins: accountLogins, removable: true, shares },
  render: (props) => (
    <AgentList
      form={props.form}
      logins={props.logins}
      removable={props.removable}
      shares={props.shares}
      unusable={props.unusable}
    />
  ),
  variants: [
    {
      slug: 'first-run',
      title: 'Nothing connected',
      description: 'Both agents with Connect, as at the first run.',
      props: { logins: {}, removable: false },
    },
    {
      slug: 'form',
      title: 'Form open',
      description:
        'The Connect form of Claude under its row, with Codex connected.',
      props: {
        logins: { codex: accountLogins.codex },
        form: {
          agent: 'claude',
          kind: 'token',
          connectTo: paths.accountAgents,
          cancel: true,
        },
      },
    },
    {
      slug: 'endpoint',
      title: 'Own endpoints',
      description:
        "Both agents on Cal's proxy: the host under each row, and the model that the list of Claude leaves out, with Refresh.",
      props: { logins: unlistedModelLogins },
    },
    {
      slug: 'not-usable',
      title: 'Signed out',
      description:
        'A ChatGPT sign-in of Codex that OpenAI did not renew: Signed out, its cause, and Sign in again.',
      props: {
        logins: { claude: accountLogins.claude, codex: { kind: 'token' } },
        unusable: {
          agent: 'codex',
          cause: codexUnusableCause,
          signInTo: paths.codexSignInAgain,
        },
      },
    },
  ],
})

/** The Agents section of the account, registered with Mokly. */
export const agentsSection = defineComponent({
  slug: 'agents-section',
  title: 'Agents section',
  description:
    'The agents that every org uses, Claude and Codex, on the Agents tab of the account: each connected login with its kind, Remove, and its share setting, or Connect. Its own page shows both agents connected.',
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
  ],
})
