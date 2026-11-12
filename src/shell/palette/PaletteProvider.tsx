import { useEffect, useState, type ReactNode } from 'react'
import type { AppModel } from '../../app/app-model'
import { useNavigation } from '../../app/navigation'
import { PaletteController } from '../../app/palette/controller'
import { useStore } from '../../app/store'
import { useApp } from '../context'
import { useShortcutOffer } from '../shortcuts/shortcut-context'
import { useOpenLayers } from '../ui/layers'
import { PaletteContext } from './palette-context'

/**
 * The keys of the Command palette command, ⌘K on a Mac and Ctrl+K
 * elsewhere by default, open a closed palette and close an open one, on
 * each page of the signed-in app. The dialog of the palette is the layer
 * of the command, so the key still runs over it, and not over a dialog or
 * a sheet of another owner. It opens through `PaletteController.show`, as
 * the Search row does.
 */
function usePaletteCommand(app: AppModel, controller: PaletteController) {
  const ready = useStore(app.boot).state === 'ready'
  const toggle = () => {
    if (controller.open.get()) controller.close()
    else controller.show()
  }
  useShortcutOffer('command-palette', ready ? toggle : null, controller)
}

/** A change of the address, such as after Back, and a sign-out close the palette. */
function useCloseOnLeave(app: AppModel, controller: PaletteController) {
  const navigation = useNavigation()
  const boot = useStore(app.boot)
  useEffect(() => {
    let href = navigation.href()
    return navigation.subscribe(() => {
      const next = navigation.href()
      if (next === href) return
      href = next
      controller.close()
    })
  }, [navigation, controller])
  useEffect(() => {
    if (boot.state !== 'ready') controller.close()
  }, [boot, controller])
}

/**
 * The command palette of the tab and its key. It reads the open layers of
 * the shortcut layer, so it sits inside `ShortcutProvider`. The layer of
 * each frame draws the palette, as `PaletteLayer` says.
 */
export function PaletteProvider(props: { children: ReactNode }) {
  const app = useApp()
  const layers = useOpenLayers()
  const [controller] = useState(() => new PaletteController(layers))
  const open = useStore(controller.open)
  usePaletteCommand(app, controller)
  useCloseOnLeave(app, controller)
  // The action of a row runs once the palette left the page: its focus
  // went back and the frame takes input again.
  useEffect(() => {
    if (!open) controller.settle()
  }, [open, controller])
  return (
    <PaletteContext.Provider value={controller}>
      {props.children}
    </PaletteContext.Provider>
  )
}
