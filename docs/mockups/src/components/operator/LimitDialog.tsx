import type { Viewport } from '@mokly/mokly'
import { Input } from '@firna/ui/input'
import { limitOrg } from '../../fixtures/migrationJob'
import { noop } from '../../noop'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { Linked } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { limitWords } from './migrationCopy'

/**
 * The question before the limit of the migration job to one org. The
 * operator gives the ID of the org, as its page and the Orgs tab show it,
 * and the hint names the org that the ID finds, with its workspaces and
 * its account. Cancel keeps every org. The caller gives the page of each
 * result, which keeps the run and the pace of the job, or none when the
 * catalogue draws no such page.
 */
export function LimitDialog(props: {
  viewport: Viewport
  cancelTo?: string
  limitTo?: string
}) {
  const { field } = useControlSizes()
  return (
    <confirmDialog.Component
      actions={
        <>
          <Linked to={props.cancelTo}>
            <actionButton.Component moklyInstance="dialog-cancel">
              {limitWords.cancel}
            </actionButton.Component>
          </Linked>
          <Linked to={props.limitTo}>
            <actionButton.Component
              moklyInstance="dialog-limit-job"
              tone="primary"
            >
              {limitWords.confirm}
            </actionButton.Component>
          </Linked>
        </>
      }
      moklyInstance="limit-job-dialog"
      title={limitWords.title}
      viewport={props.viewport}
    >
      <dialogText.Component>{limitWords.text}</dialogText.Component>
      <Input
        hint={limitWords.found(
          limitOrg.name,
          limitOrg.workspaces,
          limitOrg.account,
        )}
        label={limitWords.field}
        onChangeText={noop}
        size={field}
        value={limitOrg.id}
      />
    </confirmDialog.Component>
  )
}
