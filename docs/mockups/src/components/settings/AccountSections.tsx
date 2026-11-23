import type { AgentLogins } from '../../fixtures/logins'
import { account, installations } from '../../fixtures/orgs'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { accountAvatar } from '../../entries/components/orgs/OrgTile.mockup'
import { agentList } from '../../entries/components/settings/AgentList.mockup'
import { Connected, type LoginShares, type OpenAgentForm } from './AgentList'
import type { UnusableLogin } from './LoginNotUsable'
import type { OrgLoginUse } from '../../../../../src/ui/components/settings/OrgLoginLines'
import { section } from '../../entries/components/settings/Section.mockup'
import { defined } from '../../defined'
import styles from '../../../../../src/ui/components/settings/AccountSections.module.css'

/** The person signed in, with GitHub, and the way to sign out. */
export function SignInSection() {
  return (
    <section aria-label="Sign-in" className={styles.signIn}>
      <accountAvatar.Component moklyInstance="sign-in-avatar" size={32} />
      <span className={styles.signInText}>
        Signed in with GitHub as{' '}
        <span className={styles.login}>@{account.login}</span>
      </span>
      <actionButton.Component icon="log-out" moklyInstance="sign-out">
        Sign out
      </actionButton.Component>
    </section>
  )
}

/** The shared GitHub App, and the accounts where it is installed. */
export function GitHubSection(props: { connected: boolean }) {
  if (!props.connected) {
    return (
      <section.Component
        actions={
          <actionButton.Component
            icon="arrow-up-right"
            moklyInstance="install-github-app"
            tone="primary"
          >
            Install the GitHub App
          </actionButton.Component>
        }
        description="Install the GitHub App on the accounts whose repositories your orgs use."
        moklyInstance="github"
        title="GitHub"
      />
    )
  }
  return (
    <section.Component
      actions={
        <actionButton.Component
          icon="arrow-up-right"
          moklyInstance="manage-on-github"
        >
          Manage on GitHub
        </actionButton.Component>
      }
      description="Each org chooses its repositories from these accounts."
      moklyInstance="github"
      status={<Connected name="github-connected" />}
      title="GitHub"
    >
      <ul aria-label="GitHub accounts" className={styles.list}>
        {installations.map((item) => (
          <li className={styles.row} key={item.account}>
            <span className={styles.name}>{item.account}</span>
            <span className={styles.detail}>
              {item.repositories} repositories
            </span>
          </li>
        ))}
      </ul>
    </section.Component>
  )
}

/**
 * The agents that every org uses, Claude and Codex: each connected login
 * with its kind, the host of an own endpoint, Remove, and its share setting,
 * or Connect, which opens the form of the agent.
 * `unusable` names a login that the app can no longer
 * use. `orgLogins` names, under an agent, each org whose org login serves
 * the new sessions of the user (decisions 4 and 7 B of the org logins plan).
 */
export function AgentsSection(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  shares: LoginShares
  unusable?: UnusableLogin
  orgLogins?: OrgLoginUse
}) {
  return (
    <section.Component
      description="Every org uses these agents."
      moklyInstance="agents"
      title="Agents"
    >
      <agentList.Component
        logins={props.logins}
        moklyInstance="agent-list"
        removable
        shares={props.shares}
        {...defined({
          form: props.form,
          orgLogins: props.orgLogins,
          unusable: props.unusable,
        })}
      />
    </section.Component>
  )
}
