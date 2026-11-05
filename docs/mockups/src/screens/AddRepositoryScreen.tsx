import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { InputFrame, Textarea } from '@firna/ui/input'
import { RadioCard, RadioCardGroup } from '@firna/ui/radio'
import { Caption } from '@firna/ui/typography'
import { Search } from 'lucide-react'
import { ExternalLink } from '../components/common/ExternalLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
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
        <Button onPress={noop} tone="secondary">
          Cancel
        </Button>
      </MockLink>
      <Button onPress={noop} tone="primary">
        Add repository
      </Button>
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
        <Caption>
          The list shows the repositories that the GitHub App can reach.{' '}
          <ExternalLink href={githubAccessUrl}>Manage access</ExternalLink>
        </Caption>
        <Textarea
          hint="Optional. Runs when the base updates and each time a sandbox starts."
          label="Startup script"
          numberOfLines={3}
          onChangeText={noop}
          placeholder="npm ci"
          value=""
        />
        {mobile ? null : (
          <div className={styles.actions}>
            {actions}
            <Caption>Preparing the base takes a few minutes.</Caption>
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
