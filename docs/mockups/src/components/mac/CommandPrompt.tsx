import { thisMac, type MacCommandRequest } from '../../fixtures/mac'
import { people } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { DetailList, type Detail } from '../settings/DetailList'
import { MonoBlock } from '../settings/Section'
import styles from './CommandPrompt.module.css'

/** The facts of a request, with the reason of a longer time limit. */
function detailsOf(request: MacCommandRequest): Detail[] {
  const rows: Detail[] = [
    { term: 'Folder', value: request.folder, mono: true },
    { term: 'Reason', value: request.reason },
    { term: 'Time limit', value: request.limit },
  ]
  if (request.longerBecause) {
    rows.push({ term: 'Why longer', value: request.longerBecause })
  }
  rows.push(
    {
      term: 'Workspace',
      value: `${checkoutAutocomplete.name}, in ${orgs.acme.name}`,
    },
    { term: 'Sender', value: `${people[thisMac.owner].name} (you)` },
  )
  return rows
}

/**
 * The question of the Mac app before a command of an agent runs on this
 * Mac (decision 62): the command, its folder, its reason, its time limit,
 * the workspace, and the sender. Deny stands apart from the three ways to
 * allow it.
 */
export function CommandPrompt(props: { request: MacCommandRequest }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <span className={styles.deny}>
            <ScreenLink asChild to={paths.macDenied}>
              <ActionButton>Deny</ActionButton>
            </ScreenLink>
          </span>
          <ScreenLink asChild to={paths.macDone}>
            <ActionButton>Always allow</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.macAllowAll}>
            <ActionButton>Allow all commands for 15 minutes</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.macDone}>
            <ActionButton tone="primary">Allow</ActionButton>
          </ScreenLink>
        </>
      }
      title="Run a command on this Mac?"
      viewport="desktop"
      wide
    >
      <DialogText>
        An agent in the cloud asks to run this command, with your permissions.
      </DialogText>
      <MonoBlock text={props.request.command} />
      <DetailList rows={detailsOf(props.request)} />
    </ConfirmDialog>
  )
}
