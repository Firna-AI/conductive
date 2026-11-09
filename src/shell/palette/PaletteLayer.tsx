import { useContext } from 'react'
import { useStore, type Readable } from '../../app/store'
import { useApp } from '../context'
import { PaletteContext } from './palette-context'
import { PalettePanel } from './PalettePanel'

const closed: Readable<boolean> = {
  get: () => false,
  subscribe: () => () => undefined,
}

/**
 * The palette over the frame, while it is open. Each frame of the app has
 * this layer in its overlay host, so the palette covers the whole frame
 * and makes it inert. A page that is not signed in shows no palette.
 */
export function PaletteLayer() {
  const palette = useContext(PaletteContext)
  const open = useStore(palette?.controller.open ?? closed)
  const boot = useStore(useApp().boot)
  if (!palette || !open || boot.state !== 'ready') return null
  return <PalettePanel controller={palette.controller} />
}
