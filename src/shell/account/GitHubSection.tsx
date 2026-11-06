import { useEffect } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import styles from '../../../docs/mockups/src/components/settings/AccountSections.module.css'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import { useStore } from '../../app/store'
import type { GitHubInstallationsResponse } from '../../shared/account'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { repositoryCount } from './labels'

const title = 'GitHub'

/** The accounts where the GitHub App is installed, or the way to install it. */
function Installations(props: { response: GitHubInstallationsResponse }) {
  const { services } = useApp()
  const { installations, installUrl } = props.response
  const leave = () => services.leave(installUrl)
  if (installations.length === 0) {
    return (
      <Section
        actions={
          <ActionButton icon={ArrowUpRight} onPress={leave} tone="primary">
            Install the GitHub App
          </ActionButton>
        }
        description="Install the GitHub App on the accounts whose repositories your orgs use."
        title={title}
      />
    )
  }
  return (
    <Section
      actions={
        <ActionButton icon={ArrowUpRight} onPress={leave}>
          Manage on GitHub
        </ActionButton>
      }
      description="Each org chooses its repositories from these accounts."
      status={<StatusText label="Connected" tone="success" />}
      title={title}
    >
      <ul aria-label="GitHub accounts" className={styles.list}>
        {installations.map((item) => (
          <li className={styles.row} key={item.id}>
            <span className={styles.name}>{item.account}</span>
            <span className={styles.detail}>
              {repositoryCount(item.repositoryCount)}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/**
 * The shared GitHub App, and the accounts where it is installed. The list
 * loads each time that the account opens, because the user changes the
 * installations on GitHub.
 */
export function GitHubSection() {
  const app = useApp()
  const installations = useStore(app.account.installations)
  useEffect(() => {
    void app.account.loadInstallations()
  }, [app])
  switch (installations.state) {
    case 'loading':
      return <Section title={title} />
    case 'failed':
      return (
        <Section title={title}>
          <LoadFailure
            error={installations.error}
            retry={() => app.account.loadInstallations()}
            title="The GitHub accounts didn't load"
          />
        </Section>
      )
    case 'ready':
      return <Installations response={installations.value} />
  }
}
