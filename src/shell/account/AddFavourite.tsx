import type { RefCallback } from 'react'
import type { AgentModel } from '../../shared/generated/AgentModel'
import { Plus } from 'lucide-react'
import styles from '../../ui/components/settings/FavouritesSection.module.css'
import { agentGroups } from '../../chat/components/model-rows'
import { ActionButton } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'

/** The label of the button that adds a favourite, and the name of its list. */
const addLabel = 'Add a favourite'

/**
 * The list of Add a favourite: each model of `models` in the groups of All
 * models, as model favourites decision 4 D says. The list has no current
 * choice, so it marks no model, and it has no efforts and no Fast row.
 */
function modelEntries(
  models: readonly AgentModel[],
  pick: (model: AgentModel) => void,
): MenuEntry[] {
  return agentGroups(models).flatMap((group, index): MenuEntry[] => [
    ...(index > 0 ? [{ kind: 'divider' } as const] : []),
    ...group.map((model): MenuEntry => ({
      kind: 'item',
      id: `${model.agent}:${model.model}`,
      label: model.label,
      onSelect: () => pick(model),
    })),
  ])
}

/**
 * Add a favourite of the Favourites section. It opens the list of every
 * model of `models`, the models that the pickers of the person offer: below
 * the button on a computer, and in a sheet on a phone, as Add trigger of an
 * automation does, because the list is a menu of the section, not a model
 * picker. A pick closes the list and gives its model to `pick`. The button
 * is off while the list of favourites is `full`. `buttonRef` takes the
 * element of the button, for the owner that moves the focus to it.
 */
export function AddFavourite(props: {
  models: readonly AgentModel[]
  full: boolean
  pick: (model: AgentModel) => void
  buttonRef: RefCallback<unknown>
}) {
  return (
    <MenuButton
      className={styles.add}
      entries={modelEntries(props.models, props.pick)}
      label={addLabel}
      placement="below-start"
      trigger={({ open, toggle }) => (
        <ActionButton
          buttonRef={props.buttonRef}
          disabled={props.full}
          expanded={open}
          icon={Plus}
          menu
          onPress={toggle}
        >
          {addLabel}
        </ActionButton>
      )}
    />
  )
}
