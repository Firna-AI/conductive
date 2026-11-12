import { useContext } from 'react'
import { useStore, type Readable } from '../../app/store'
import { useApp } from '../context'
import { PaletteContext } from './palette-context'
import { PaletteKeys } from './PaletteKeys'
import { PalettePanel } from './PalettePanel'

const closed: Readable<boolean> = {
  get: () => false,
  subscribe: () => () => undefined,
}

/**
 * The palette over the frame, while it is open. Each frame of the app has
 * this layer in its overlay host, so the palette covers the whole frame
 * and makes it inert. The layer also offers the commands of the palette to
 * the keys, inside the New workspace host of the frame. A page that is not
 * signed in shows no palette and offers no command.
 */
export function PaletteLayer() {
  const controller = useContext(PaletteContext)
  const open = useStore(controller?.open ?? closed)
  const boot = useStore(useApp().boot)
  if (!controller || boot.state !== 'ready') return null
  return (
    <>
      <PaletteKeys />
      {open ? <PalettePanel controller={controller} /> : null}
    </>
  )
}
