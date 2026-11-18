import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefCallback,
} from 'react'
import { tileMenuItems } from '../../../docs/mockups/src/components/orgs/orgTileMenu'
import type { OrgSummary } from '../../shared/orgs'
import type { MenuEntry } from '../ui/Menu'
import { opensMenu } from '../ui/menu-keys'
import type { MenuAnchor } from '../ui/menu-place'
import { PointMenu } from '../ui/PointMenu'

/** The menu keys open the tile menu this far right of the tile. */
const beside = 8

/** The links of the org tiles, which take the focus back from the menu. */
class TileLinks {
  private readonly nodes = new Map<string, HTMLAnchorElement>()
  private readonly refs = new Map<string, RefCallback<HTMLAnchorElement>>()

  /** The ref of the link of an org tile. It stays the same between renders. */
  ref(orgId: string): RefCallback<HTMLAnchorElement> {
    const known = this.refs.get(orgId)
    if (known) return known
    const ref: RefCallback<HTMLAnchorElement> = (node) => {
      if (node) this.nodes.set(orgId, node)
      else this.nodes.delete(orgId)
    }
    this.refs.set(orgId, ref)
    return ref
  }

  /** Gives the focus to the link of the tile of an org. */
  focus(orgId: string): void {
    this.nodes.get(orgId)?.focus()
  }
}

/**
 * The menu of each org tile, with Move up and Move down (decision 515 C). A
 * right click opens it at the pointer, in place of the menu of the browser.
 * Shift and F10, or the Menu key, on a focused tile opens it beside the
 * tile, at its right, where the name of a focused tile shows, so it covers
 * no tile that a move passes. A move that the place of the tile rules out
 * is off. The menu opens no org, and it gives the focus back to the link of
 * the tile as it closes, also after a move. Every org tile has it, also the
 * tile of a suspended org (decision 516 A). A deleted org has no tile. A finger that holds
 * a tile lifts it for a drag and opens no menu.
 */
export function useTileMenu(props: {
  orgs: readonly OrgSummary[]
  step: (org: OrgSummary, by: -1 | 1) => void
}) {
  const { orgs } = props
  const [links] = useState(() => new TileLinks())
  const [open, setOpen] = useState<{
    orgId: string
    anchor: MenuAnchor
  } | null>(null)
  const index = open ? orgs.findIndex((org) => org.id === open.orgId) : -1
  // An org that leaves the rail closes its menu.
  if (open && index < 0) setOpen(null)
  const org = index >= 0 ? orgs[index] : undefined

  const onContextMenu = (item: OrgSummary, event: MouseEvent<HTMLElement>) => {
    // A drag stops the event while a finger holds the tile.
    if (event.defaultPrevented) return
    event.preventDefault()
    // A browser can also send this event after the keys that open the menu.
    if (open?.orgId === item.id) return
    setOpen({ orgId: item.id, anchor: { x: event.clientX, y: event.clientY } })
  }
  /** Opens the menu of a focused tile on the menu keys, and says whether it did. */
  const onKeyDown = (
    item: OrgSummary,
    event: KeyboardEvent<HTMLElement>,
  ): boolean => {
    if (!opensMenu(event)) return false
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    setOpen({ orgId: item.id, anchor: { x: box.right + beside, y: box.top } })
    return true
  }

  const layer =
    open && org ? (
      <PointMenu
        anchor={open.anchor}
        back={() => links.focus(org.id)}
        choices={null}
        close={() => {
          setOpen(null)
          return true
        }}
        entries={tileMenuItems(index, orgs.length).map((item): MenuEntry => ({
          kind: 'item',
          label: item.label,
          icon: item.icon,
          disabled: item.disabled,
          onSelect: () => props.step(org, item.move === 'up' ? -1 : 1),
        }))}
        key={org.id}
        label={org.name}
        showChoices={() => false}
      />
    ) : null
  return {
    openId: org?.id ?? null,
    linkRef: (orgId: string) => links.ref(orgId),
    onContextMenu,
    onKeyDown,
    layer,
  }
}
