import { defineComponent } from '@mokly/mokly'
import { AgentList } from '../../../components/settings/AgentList'
import {
  accountLogins,
  codexUnusableCause,
  unlistedModelLogins,
} from '../../../fixtures/logins'
import { paths } from '../../../paths'
import { agentListProperties, loginSharesSchema } from './loginSchemas'

/** The share settings of the account, with no change that failed. */
const shares = { notSaved: null }

/** Claude and Codex, each with Connect or its login, registered with Mokly. */
export const agentList = defineComponent({
  slug: 'agent-list',
  title: 'Agent list',
  description:
    'Claude and Codex, each with Connect, or Connected and the kind of its login. An own endpoint login shows its host and the lines of its model list under its row. Connect opens the form of the agent under its row. On the account, each login has Remove and its share setting. A login that the app can no longer use says Signed out, with its cause and Sign in again. Under an agent, a line names each org whose org login serves the new sessions of the person. Its own page shows both agents connected, as on the account.',
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
      orgLogins={props.orgLogins}
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
