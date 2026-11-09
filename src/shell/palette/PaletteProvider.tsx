import { useEffect, useState, type ReactNode } from 'react'
import type { AppModel } from '../../app/app-model'
import { useNavigation } from '../../app/navigation'
import { PaletteController } from '../../app/palette/controller'
import { isPaletteKey, paletteKeyOutcome } from '../../app/palette/palette-keys'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { useApp } from '../context'
import { LayersContext, OpenLayers } from '../ui/layers'
import { PaletteContext, type PaletteHandle } from './palette-context'

/** Whether a key press comes from inside one of the elements. */
function inside(
  elements: ReadonlySet<HTMLElement>,
  target: EventTarget | null,
): boolean {
  return (
    target instanceof Node &&
    [...elements].some((element) => element.contains(target))
  )
}

/**
 * The palette key, ⌘K on a Mac and Ctrl+K elsewhere, opens and closes the
 * palette on each page of the signed-in app. It does nothing while a
 * dialog or a sheet other than the palette holds the focus, also over the
 * open palette. It opens through `PaletteController.show`, which closes
 * an open menu first, and stays closed when a menu does not close. When
 * it opens or closes the palette, the browser does not also run its own
 * action. A held key acts once.
 */
function usePaletteKey(
  app: AppModel,
  palette: PaletteHandle,
  layers: OpenLayers,
) {
  const { onKey, platform } = useServices()
  useEffect(
    () =>
      onKey((press) => {
        if (press.isComposing || !isPaletteKey(press, platform)) return
        if (app.boot.get().state !== 'ready') return
        const { controller, terminals } = palette
        const outcome = paletteKeyOutcome({
          platform,
          open: controller.open.get(),
          modal: layers.modalOpen(controller),
          inTerminal: inside(terminals, press.target),
        })
        if (outcome === 'close') {
          press.preventDefault()
          if (!press.repeat) controller.close()
        } else if (outcome === 'open' && !press.repeat && controller.show()) {
          press.preventDefault()
        }
      }),
    [onKey, platform, app, palette, layers],
  )
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
 * The command palette of the tab, its key, and the open layers that every
 * UI kit of the app notes, because the key reads them. The layer of each
 * frame draws the palette, as `PaletteLayer` says.
 */
export function PaletteProvider(props: { children: ReactNode }) {
  const app = useApp()
  const [layers] = useState(() => new OpenLayers())
  const [palette] = useState<PaletteHandle>(() => ({
    controller: new PaletteController(layers),
    terminals: new Set(),
  }))
  const { controller } = palette
  const open = useStore(controller.open)
  usePaletteKey(app, palette, layers)
  useCloseOnLeave(app, controller)
  // The action of a row runs once the palette left the page: its focus
  // went back and the frame takes input again.
  useEffect(() => {
    if (!open) controller.settle()
  }, [open, controller])
  return (
    <PaletteContext.Provider value={palette}>
      <LayersContext.Provider value={layers}>
        {props.children}
      </LayersContext.Provider>
    </PaletteContext.Provider>
  )
}
