import type { ReactNode } from 'react'

/**
 * Room above a part on its own page, for a list that opens above it, such
 * as the list of `@` above the message box. A page starts at the top of
 * the view, where such a list has no room, so only the own pages of a part
 * pass the prop that asks for it. On a screen the chat lies above the box.
 */
export const roomAboveSchema = { type: 'boolean' } as const

/** The room for the list of `@`: its most height, and its gap to the box. */
const room = 340

/** `node` with room above it, when `roomAbove` asks for it. */
export function withRoomAbove(
  node: ReactNode,
  roomAbove: boolean | undefined,
): ReactNode {
  if (roomAbove !== true) return node
  return (
    <div style={{ paddingTop: room }}>
      <div style={{ position: 'relative' }}>{node}</div>
    </div>
  )
}

/**
 * The height of the place of a part on its own page, for a part that fills
 * the height of its place, such as the tab of a file. Only own pages pass
 * it: on a screen the column of the tab gives the height.
 */
export const placeHeightSchema = { type: 'number', minimum: 1 } as const

/** `node` in a place of the height `height`, when there is one. */
export function inPlace(
  node: ReactNode,
  height: number | undefined,
): ReactNode {
  if (height === undefined) return node
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      {node}
    </div>
  )
}
