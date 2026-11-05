import type { SchemaProps, Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { DropdownSelector } from '@firna/ui/dropdown'
import { Input, Textarea } from '@firna/ui/input'
import { SegmentedControl } from '@firna/ui/segmented'
import { CircleAlert } from 'lucide-react'
import { Notice } from '../components/common/Notice'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { savedCartsMessage } from '../fixtures/conversations'
import { repositories, repositoryKeys } from '../fixtures/repositories'
import { agentNames, savedCarts, type AgentKey } from '../fixtures/workspaces'
import { noop } from '../noop'
import { paths } from '../paths'
import styles from './forms.module.css'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['result'],
  properties: { result: { enum: ['form', 'error'] } },
} as const

export type NewWorkspaceState = SchemaProps<typeof newWorkspaceSchema>

const repositoryOptions = repositoryKeys.map((key) => ({
  label: repositories[key].name,
  value: key,
}))

const agentOptions: { label: string; value: AgentKey }[] = [
  { label: agentNames['claude-code'], value: 'claude-code' },
  { label: agentNames.codex, value: 'codex' },
]

/** The form that creates a workspace, with its optional first message. */
export function NewWorkspaceScreen(props: {
  state: NewWorkspaceState
  viewport: Viewport
}) {
  const failed = props.state.result === 'error'
  const repository = repositories[savedCarts.repository]
  const actions = (
    <>
      <MockLink asChild to={paths.shell}>
        <Button onPress={noop} tone="secondary">
          Cancel
        </Button>
      </MockLink>
      <MockLink asChild to={paths.creating}>
        <Button onPress={noop} tone="primary">
          {failed ? 'Try again' : 'Create workspace'}
        </Button>
      </MockLink>
    </>
  )
  const mobile = props.viewport === 'mobile'
  const page = (
    <Page
      actions={mobile ? actions : undefined}
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      title="New workspace"
      viewport={props.viewport}
    >
      <div className={styles.form}>
        {failed ? (
          <Notice
            body="Its sandbox didn't start. Your details are kept."
            icon={CircleAlert}
            title="The workspace wasn't created"
            tone="danger"
          />
        ) : null}
        <DropdownSelector
          hint={`Starts from the base updated ${repository.baseUpdated}.`}
          label="Repository"
          onValueChange={noop}
          options={repositoryOptions}
          value={savedCarts.repository}
        />
        <Input label="Name" onChangeText={noop} value={savedCarts.name} />
        <Input
          hint={`Created from ${repository.defaultBranch}.`}
          label="Branch"
          onChangeText={noop}
          value={savedCarts.branch}
        />
        <SegmentedControl
          label="Agent"
          onChange={noop}
          options={agentOptions}
          value={savedCarts.agent}
        />
        <Textarea
          hint="Optional. The agent starts on it when the sandbox is ready."
          label="First message"
          numberOfLines={4}
          onChangeText={noop}
          value={savedCartsMessage}
        />
        {mobile ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame sidebar={<Sidebar groups={workspaceGroups()} />}>{page}</AppFrame>
  )
}
