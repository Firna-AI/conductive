import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  buildShortcutKeymap,
  type ShortcutKeymap,
} from '../../app/shortcuts/keymap'
import { useServices, type Platform } from '../../app/services'
import { LayersContext, OpenLayers } from '../ui/layers'
import { ShortcutContext, type ShortcutLayer } from './shortcut-context'
import { handleShortcutPress } from './shortcut-listener'
import { ShortcutOffers } from './shortcut-offers'

/**
 * The keymap of the tab: the keys of each command for the keyboard of the
 * person. The listener and each key hint read it here, and nowhere else.
 * The changes that a person saves do not apply yet, so each command has
 * its default keys.
 */
function useKeymap(keyboard: Platform): ShortcutKeymap {
  return useMemo(() => buildShortcutKeymap(keyboard, []), [keyboard])
}

/**
 * The shortcut layer of the tab: the one key listener of the app, on
 * `AppServices.onKey`, with the commands that the parts of the page offer,
 * the terminals that their owners mark, and the open menus and modal
 * layers that every UI kit of the app notes.
 */
export function ShortcutProvider(props: { children: ReactNode }) {
  const { onKey, platform, host } = useServices()
  const [layers] = useState(() => new OpenLayers())
  const [offers] = useState(() => new ShortcutOffers())
  const [terminals] = useState(() => new Set<HTMLElement>())
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
          layers,
        }),
      ),
    [onKey, platform, host, keymap, offers, terminals, layers],
  )
  const shortcuts = useMemo<ShortcutLayer>(
    () => ({ offers, terminals, keymap }),
    [offers, terminals, keymap],
  )
  return (
    <ShortcutContext.Provider value={shortcuts}>
      <LayersContext.Provider value={layers}>
        {props.children}
      </LayersContext.Provider>
    </ShortcutContext.Provider>
  )
}
