import { useEffect } from 'react'
import { X } from 'lucide-react'
import { RemoveRepositoryText } from '../../ui/components/settings/RemoveRepositoryText'
import { repositoryRemoval } from '../../ui/components/settings/repositoryRemovalCopy'
import type { OrgModel } from '../../app/org-model'
import { setRepositorySelected } from '../../app/settings-actions'
import { useStore, valueOf } from '../../app/store'
import { ActionButton } from '../ui/actions'
import { Dialog } from '../ui/Dialog'
import { useAction } from '../ui/useAction'
import type { AskedRemoval } from './useRowRemoval'

/**
 * The question before Remove of the row menu of a chosen repository. It
 * names the repository and what adding it again does not bring back, as
 * `RemoveRepositoryText` says. It reads the automations of the org while
 * it shows, and counts the active ones of the repository. Until they load,
 * or when they do not load, the text gives no number. Remove saves the
 * removal at once with the route of Done, and starts no build. The
 * question stays open until the answer comes. A failed removal keeps the
 * question and the row, and a toast gives the error. `done` runs after the
 * removal saved, and `returnFocus` places the focus as the question
 * closes.
 */
export function RemoveRepositoryDialog(props: {
  model: OrgModel
  asked: AskedRemoval
  close: () => void
  done: () => void
  returnFocus: () => void
}) {
  const { model } = props
  const { repository } = props.asked
  const automations = valueOf(useStore(model.automations))
  useEffect(() => model.watch('automations'), [model])
  const remove = useAction(async () => {
    await setRepositorySelected(model, repository, false)
    props.done()
  }, repositoryRemoval.failed)
  const active =
    automations === undefined
      ? null
      : automations.filter(
          (automation) =>
            automation.repositoryId === repository.id && automation.active,
        ).length
  return (
    <Dialog
      action={
        <ActionButton
          busy={remove.pending}
          icon={X}
          onPress={() => remove.run()}
          tone="danger"
        >
          {repositoryRemoval.confirm}
        </ActionButton>
      }
      busy={remove.pending}
      close={props.close}
      returnFocus={props.returnFocus}
      title={repositoryRemoval.title(repository.fullName)}
    >
      <RemoveRepositoryText automations={active} place={props.asked.place} />
    </Dialog>
  )
}
