import { Fragment, useEffect } from 'react'
import { ArrowUpRight, Plus } from 'lucide-react'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import { getStartedCopy } from '../../../docs/mockups/src/screens/getStartedCopy'
import styles from '../../../docs/mockups/src/screens/GetStartedScreen.module.css'
import type { StepState } from '../../app/get-started'
import { useStore, valueOf } from '../../app/store'
import type { GitHubInstallation } from '../../shared/account'
import { LoadFailure } from '../ui/LoadFailure'
import { useGitHubInstall } from '../account/githubInstall'
import { repositoryCount } from '../account/labels'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { DoneStatus } from './stepParts'

const copy = getStartedCopy.install

/** The accounts of the installations, such as "acme and futex", in bold. */
function AccountNames(props: { installations: readonly GitHubInstallation[] }) {
  const names = props.installations.map((item) => item.account)
  const parts = new Intl.ListFormat('en', {
    type: 'conjunction',
  }).formatToParts(names)
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.type === 'element' ? (
            <span className={styles.strong}>{part.value}</span>
          ) : (
            part.value
          )}
        </Fragment>
      ))}
    </>
  )
}

/** Where the GitHub App is installed, and the number of its repositories. */
function InstalledText(props: {
  installations: readonly GitHubInstallation[]
}) {
  const { installations } = props
  if (installations.length === 0) return null
  const total = installations.reduce(
    (sum, item) => sum + item.repositoryCount,
    0,
  )
  return (
    <SectionText>
      Installed on <AccountNames installations={installations} />, with{' '}
      {repositoryCount(total)}.
    </SectionText>
  )
}

/**
 * The GitHub App, which gives the app the repositories of the accounts
 * where the user installs it. The installations give the address of the
 * install page, so the buttons wait for them. They read again when the
 * user comes back from GitHub in another window, as from the Mac app.
 */
export function InstallStep(props: { state: StepState }) {
  const app = useApp()
  const installations = useStore(app.account.installations)
  const openInstall = useGitHubInstall('get-started')
  useEffect(() => app.account.watchInstallations(), [app])
  const response = valueOf(installations)
  const install = () => {
    if (response) openInstall(response.installUrl)
  }
  const failed =
    installations.state === 'failed' ? (
      <LoadFailure
        error={installations.error}
        retry={() => app.account.loadInstallations()}
        title="The GitHub accounts didn't load"
      />
    ) : null
  if (props.state === 'done') {
    return (
      <Section
        actions={
          <ActionButton disabled={!response} icon={Plus} onPress={install}>
            {copy.another}
          </ActionButton>
        }
        status={<DoneStatus label={copy.done} />}
        title={copy.title}
      >
        <InstalledText installations={response?.installations ?? []} />
        {failed}
      </Section>
    )
  }
  const next = props.state === 'next'
  return (
    <Section
      actions={
        <ActionButton
          disabled={!next || !response}
          icon={ArrowUpRight}
          onPress={install}
          tone={next ? 'primary' : 'secondary'}
        >
          {copy.action}
        </ActionButton>
      }
      description={copy.description}
      title={copy.title}
    >
      {failed}
    </Section>
  )
}
