import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  buildShortcutKeymap,
  type ShortcutKeymap,
} from '../../app/shortcuts/keymap'
import { useServices, type Platform } from '../../app/services'
import { useStore } from '../../app/store'
import { useApp } from '../context'
import { LayersContext, OpenLayers } from '../ui/layers'
import { ShortcutContext, type ShortcutLayer } from './shortcut-context'
import { handleShortcutPress } from './shortcut-listener'
import { ShortcutOffers } from './shortcut-offers'

/**
 * The keymap of the tab: the keys of each command for the keyboard of the
 * person, with the changes that the account holds for that keyboard. The
 * listener and each key hint read it here, and nowhere else. A save of the
 * Keyboard shortcuts tab changes the account, so the keys and the hints
 * follow it at once. Before the account loads, each command has its
 * default keys.
 */
function useKeymap(keyboard: Platform): ShortcutKeymap {
  const changes = useStore(useApp().account.account)?.shortcuts[keyboard]
  return useMemo(
    () => buildShortcutKeymap(keyboard, changes ?? []),
    [keyboard, changes],
  )
}

/**
 * The shortcut layer of the tab: the one key listener of the app, on
 * `AppServices.onKey`, with the commands that the parts of the page offer,
 * the terminals that their owners mark, the recorder of the Keyboard
 * shortcuts tab, and the open menus and modal layers that every UI kit of
 * the app notes.
 */
export function ShortcutProvider(props: { children: ReactNode }) {
  const { onKey, platform, host } = useServices()
  const [layers] = useState(() => new OpenLayers())
  const [offers] = useState(() => new ShortcutOffers())
  const [terminals] = useState(() => new Set<HTMLElement>())
  const [recorders] = useState(() => new Set<HTMLElement>())
  const keymap = useKeymap(platform)
  useEffect(
    () =>
      onKey((press) =>
        handleShortcutPress(press, {
          keyboard: platform,
          host,
          keymap,
          offers,
          terminals,
          recorders,
          layers,
        }),
      ),
    [onKey, platform, host, keymap, offers, terminals, recorders, layers],
  )
  const shortcuts = useMemo<ShortcutLayer>(
    () => ({ offers, terminals, recorders, keymap }),
    [offers, terminals, recorders, keymap],
  )
  return (
    <ShortcutContext.Provider value={shortcuts}>
      <LayersContext.Provider value={layers}>
        {props.children}
      </LayersContext.Provider>
    </ShortcutContext.Provider>
  )
}
