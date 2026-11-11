import { useServices } from '../../../app/services'
import { barCommands } from '../../../github/barKeys'
import type { BarControls } from '../../../github/barView'
import { useShortcutOffers } from '../../shortcuts/shortcut-context'

/**
 * Offers the keys of the pull request bar while the bar shows, beside its
 * buttons: the command of each button that takes a click runs what the
 * click runs, so Merge PR merges at once, and Open PR on GitHub opens the
 * pull request in a new tab while the bar links it. A busy or disabled
 * button offers no key. The bar's Archive offers none: the palette runs
 * Archive workspace, as it does for every Archive. It draws nothing.
 */
export function BarKeys(props: { controls: BarControls | null }) {
  const { openInNewTab } = useServices()
  const { controls } = props
  const commands = controls ? barCommands(controls, openInNewTab) : []
  useShortcutOffers(
    commands.filter(({ command }) => command !== 'archive-workspace'),
  )
  return null
}
