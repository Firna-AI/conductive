import { useEffect, useMemo, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import {
  ArrowDownToLine,
  CircleAlert,
  FolderOpen,
  Laptop,
  ShieldCheck,
  Unplug,
} from 'lucide-react'
import { productName } from '../../../docs/mockups/src/brand'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import styles from '../../../docs/mockups/src/screens/conductorImportParts.module.css'
import {
  ConductorImport,
  importable,
  type ImportState,
} from '../../app/import/import-model'
import { useStore, valueOf } from '../../app/store'
import { createDeviceApi } from '../../chat/device/device-api'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { Page } from '../layout/Page'
import { useMacApp } from '../mac/mac-app'
import { ActionButton } from '../ui/actions'
import { ImportListView } from './ImportListView'
import { ImportProgressView } from './ImportProgressView'

/** A wait of the page, with a spinner while this Mac reads. */
function Waiting(props: { text: string }) {
  const theme = useSharedUiTheme()
  return (
    <p className={styles.waiting}>
      <Spinner color={theme.colors.muted} size={13} />
      {props.text}
    </p>
  )
}

/** Import, with the count of the selection. */
function importLabel(count: number): string {
  if (count === 0) return 'Import'
  return count === 1 ? 'Import 1 workspace' : `Import ${count} workspaces`
}

/** The count of the selected rows that can import. */
function selectedCount(state: ImportState): number {
  if (state.scan.kind !== 'ready') return 0
  return state.scan.rows.filter(
    (row) => importable(row) && state.selected.has(row.localWorkspaceId),
  ).length
}

/** What the page shows in each state of its list and its uploads. */
function body(
  state: ImportState,
  model: ConductorImport,
  parts: Pick<Parameters<typeof ImportListView>[0], 'org' | 'workspaceOf'>,
): ReactNode {
  const retry = (id: string) => void model.retry(id)
  if (state.uploads) {
    return <ImportProgressView items={state.uploads} retry={retry} {...parts} />
  }
  const { scan } = state
  const again = (label: string) => (
    <ActionButton onPress={() => void model.scan()}>{label}</ActionButton>
  )
  switch (scan.kind) {
    case 'idle':
    case 'reading':
      return <Waiting text="Reading your Conductor workspaces" />
    case 'denied':
      return (
        <EmptyState
          action={again('Ask again')}
          body={`${productName} reads your Conductor data on this Mac only after you allow it.`}
          icon={ShieldCheck}
          title="Allow access to list your workspaces"
        />
      )
    case 'unavailable':
      return (
        <EmptyState
          action={again('Try again')}
          body="The Mac app connects again by itself."
          icon={Unplug}
          title="This Mac is not connected"
        />
      )
    case 'failed':
      return (
        <EmptyState
          action={again('Try again')}
          body={scan.message}
          icon={CircleAlert}
          title="Your Conductor workspaces didn't load"
        />
      )
    case 'ready':
      if (scan.rows.length === 0) {
        return (
          <EmptyState
            body="The workspaces that are open in Conductor on this Mac show here."
            icon={FolderOpen}
            title="Nothing to import yet"
          />
        )
      }
      return (
        <>
          <p className={styles.intro}>
            Each workspace joins Import from Conductor with its chats when its
            upload ends. Its cloud computer starts when you activate it.
          </p>
          <ImportListView
            busy={false}
            retry={retry}
            rows={scan.rows}
            selectAll={(on) => model.selectAll(on)}
            selected={state.selected}
            toggle={(id) => model.toggle(id)}
            {...parts}
          />
        </>
      )
  }
}

/** The page of the import of one org, in the Mac app. */
function MacImport(props: { org: OrgSummary }) {
  const { org } = props
  const orgModel = useOrgModel(org.id)
  const model = useMemo(
    () =>
      new ConductorImport(org.id, {
        fetch: orgModel.services.api.fetch,
        pairing: () => createDeviceApi(orgModel.services.api).current(),
        imported: () => void orgModel.reload('list'),
      }),
    [org.id, orgModel],
  )
  useEffect(() => {
    void model.scan()
    return () => model.stop()
  }, [model])
  useEffect(() => orgModel.watch('list'), [orgModel])
  const state = useStore(model.state)
  const workspaces = valueOf(useStore(orgModel.workspaces))
  const workspaceOf = (id: string) =>
    workspaces?.find((workspace) => workspace.id === id)
  const count = selectedCount(state)
  const listed = state.uploads === null && state.scan.kind === 'ready'
  return (
    <Page
      actions={
        listed && state.scan.kind === 'ready' && state.scan.rows.length > 0 ? (
          <ActionButton
            disabled={count === 0}
            icon={ArrowDownToLine}
            onPress={() => void model.importSelected()}
            tone="primary"
          >
            {importLabel(count)}
          </ActionButton>
        ) : undefined
      }
      subtitle={org.name}
      title="Import from Conductor"
    >
      {body(state, model, { org, workspaceOf })}
    </Page>
  )
}

/**
 * The import from Conductor into an org. Only the Mac app imports, because
 * it reads the data of Conductor on its Mac, so a browser names the Mac
 * app and reads nothing. A new open reads the list again, and leaving the
 * page stops each upload.
 */
export function ConductorImportScreen(props: { org: OrgSummary }) {
  const mac = useMacApp()
  if (!mac) {
    return (
      <Page subtitle={props.org.name} title="Import from Conductor">
        <EmptyState
          body="The Mac app reads your Conductor workspaces on its Mac."
          icon={Laptop}
          title="Import in the Mac app"
        />
      </Page>
    )
  }
  return <MacImport org={props.org} />
}
