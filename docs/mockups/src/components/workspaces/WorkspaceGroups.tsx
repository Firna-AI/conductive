import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { List, ListItem } from '@firna/ui/list'
import { StatusDot } from '@firna/ui/status-dot'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Label, Overline } from '@firna/ui/typography'
import { CircleAlert, Settings } from 'lucide-react'
import { noop } from '../../noop'
import type { WorkspaceGroup, WorkspaceRow } from './groups'
import { activityPresentation } from './status'
import styles from './WorkspaceGroups.module.css'

function RowView(props: { row: WorkspaceRow }) {
  const { row } = props
  const theme = useSharedUiTheme()
  const status = activityPresentation[row.status]
  const description = status.showsTime
    ? `${status.label} · ${row.workspace.updated}`
    : status.label
  const item = (
    <ListItem
      description={description}
      leading={
        <StatusDot
          color={status.dim ? theme.colors.faint : undefined}
          pulse={status.pulse}
          tone={status.tone}
        />
      }
      size="sm"
      title={<Label numberOfLines={1}>{row.workspace.name}</Label>}
    />
  )
  const className = row.selected
    ? `${styles.row} ${styles.selected}`
    : styles.row
  if (!row.to) return <div className={className}>{item}</div>
  return (
    <MockLink
      aria-current={row.selected ? 'page' : undefined}
      className={className}
      to={row.to}
    >
      {item}
    </MockLink>
  )
}

function SettingsButton(props: { name: string; to?: string }) {
  const button = (
    <Button
      accessibilityLabel={`Settings for ${props.name}`}
      icon={Settings}
      onPress={noop}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
  if (!props.to) return button
  return (
    <MockLink asChild to={props.to}>
      {button}
    </MockLink>
  )
}

/**
 * The workspaces of each repository. The sidebar shows flat rows; a page
 * shows each group as a card.
 */
export function WorkspaceGroups(props: {
  groups: readonly WorkspaceGroup[]
  variant: 'sidebar' | 'page'
}) {
  return (
    <div className={styles.groups}>
      {props.groups.map((group) => {
        const name = group.repository.name
        const list = (
          <List
            accessibilityLabel={`Workspaces in ${name}`}
            itemKey={(row) => row.workspace.key}
            items={[...group.rows]}
            renderItem={(row) => <RowView row={row} />}
            separators={props.variant === 'page'}
          />
        )
        return (
          <section className={styles.group} key={group.repository.key}>
            <div className={styles.header}>
              <div className={styles.name}>
                <Overline numberOfLines={1}>{name}</Overline>
              </div>
              {group.repository.base === 'failed' ? (
                <CircleAlert
                  aria-hidden={false}
                  aria-label="The base update failed"
                  className={styles.alert}
                  role="img"
                  size={16}
                />
              ) : null}
              <SettingsButton name={name} to={group.settingsTo} />
            </div>
            {props.variant === 'page' ? (
              <div className={styles.card}>{list}</div>
            ) : (
              list
            )}
          </section>
        )
      })}
    </div>
  )
}
