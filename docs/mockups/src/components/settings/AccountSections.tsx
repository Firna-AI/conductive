import { ArrowUpRight, LogOut } from 'lucide-react'
import { agentKeys, agents, defaultChoice } from '../../fixtures/agents'
import { account, installations } from '../../fixtures/orgs'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton } from '../common/actions'
import { AccountAvatar } from '../orgs/OrgTile'
import { StatusText } from '../common/StatusText'
import { Section } from './Section'
import styles from './AccountSections.module.css'

const connected = <StatusText label="Connected" tone="success" />

/** The person signed in, with GitHub, and the way to sign out. */
export function SignInSection() {
  return (
    <section aria-label="Sign-in" className={styles.signIn}>
      <AccountAvatar size={32} />
      <span className={styles.signInText}>
        Signed in with GitHub as{' '}
        <span className={styles.login}>@{account.login}</span>
      </span>
      <ActionButton icon={LogOut}>Sign out</ActionButton>
    </section>
  )
}

/** The shared GitHub App, and the accounts where it is installed. */
export function GitHubSection(props: { connected: boolean }) {
  if (!props.connected) {
    return (
      <Section
        actions={
          <ActionButton icon={ArrowUpRight} tone="primary">
            Install the GitHub App
          </ActionButton>
        }
        description="Install the GitHub App on the accounts whose repositories your orgs use."
        title="GitHub"
      />
    )
  }
  return (
    <Section
      actions={
        <ActionButton icon={ArrowUpRight}>Manage on GitHub</ActionButton>
      }
      description="Each org chooses its repositories from these accounts."
      status={connected}
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
    </Section>
  )
}

/**
 * The agents that every org uses, Claude and Codex. How the user connects
 * one is still open, so the rows say only Connect or Connected.
 */
export function AgentsSection(props: { connected: boolean }) {
  return (
    <Section description="Every org uses these agents." title="Agents">
      <ul aria-label="Agents" className={styles.list}>
        {agentKeys.map((key) => (
          <li className={styles.row} key={key}>
            <span className={styles.name}>{agents[key].name}</span>
            <span className={styles.detail}>
              {props.connected ? connected : null}
            </span>
            {props.connected ? null : <ActionButton>Connect</ActionButton>}
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** The model and the effort that new workspaces start with. */
export function DefaultsSection() {
  return (
    <Section
      description="New workspaces start with these. Each message can change them."
      title="New workspaces"
    >
      <div className={styles.defaults}>
        <span className={styles.defaultsLabel}>Model and effort</span>
        <ModelPicker choice={defaultChoice} />
      </div>
    </Section>
  )
}
