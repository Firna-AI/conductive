import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { InputFrame, Textarea } from '@firna/ui/input'
import { RadioCard, RadioCardGroup } from '@firna/ui/radio'
import { Search } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ExternalLink } from '../components/common/ExternalLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { control } from '../design/metrics'
import { addableRepositories } from '../fixtures/repositories'
import { noop } from '../noop'
import { paths } from '../paths'
import styles from './forms.module.css'

const githubAccessUrl = 'https://github.com/settings/installations'

/** Adds a GitHub repository, which prepares its first base. */
export function AddRepositoryScreen(props: { viewport: Viewport }) {
  const mobile = props.viewport === 'mobile'
  const actions = (
    <>
      <MockLink asChild to={paths.shell}>
        <ActionButton>Cancel</ActionButton>
      </MockLink>
      <ActionButton tone="primary">Add repository</ActionButton>
    </>
  )
  const page = (
    <Page
      actions={mobile ? actions : undefined}
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      title="Add repository"
      viewport={props.viewport}
    >
      <div className={styles.form}>
        <InputFrame
          accessibilityLabel="Search repositories"
          onChangeText={noop}
          placeholder="Search repositories"
          prefixIcon={Search}
          size={control.field}
          value=""
        />
        <RadioCardGroup label="Repository">
          {addableRepositories.map((repository, index) => (
            <RadioCard
              body={repository.description}
              checked={index === 1}
              key={repository.name}
              onPress={noop}
              title={repository.name}
            />
          ))}
        </RadioCardGroup>
        <p className={styles.note}>
          The list shows the repositories that the GitHub App can reach.{' '}
          <ExternalLink href={githubAccessUrl}>Manage access</ExternalLink>
        </p>
        <Textarea
          hint="Optional. Runs when the base updates and each time a sandbox starts."
          label="Startup script"
          numberOfLines={3}
          onChangeText={noop}
          placeholder="npm ci"
          size={control.field}
          value=""
        />
        {mobile ? null : (
          <div className={styles.actions}>
            {actions}
            <p className={styles.note}>
              Preparing the base takes a few minutes.
            </p>
          </div>
        )}
      </div>
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame sidebar={<Sidebar groups={workspaceGroups()} />}>{page}</AppFrame>
  )
}
