import { act } from 'react'
import { Copy } from 'lucide-react'
import { onTestFinished } from 'vitest'
import { OverlayHost } from '../../shell/ui/Overlay'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { mount } from '../../test-support/mount'
import {
  filesAfterHistory,
  startFiles,
  testNavigation,
} from '../files-test-kit'
import type { FileListKind, FilesLayout, FilesTarget } from '../navigation'
import { FilesPanel } from './FilesPanel'
import type { FileRowTarget, RowMenuItems } from './row-menu'

// The helpers of the mounted tests of the row menu of the Files panel.

/**
 * A row menu whose one item records the row of each press. `asked` keeps
 * each real path that the menu asked items for.
 */
export function recordedItems() {
  const pressed: FileRowTarget[] = []
  const asked = new Set<string>()
  const items: RowMenuItems = (row) => {
    asked.add(row.path)
    const onSelect = () => pressed.push(row)
    return [[{ kind: 'item', label: 'Copy path', icon: Copy, onSelect }]]
  }
  return { pressed, asked, items }
}

/** The panel over the fake API, after the store read both lists. */
export async function mountPanel(options: {
  server?: FakeApiServer
  list: FileListKind
  layout?: FilesLayout
  rowMenu: RowMenuItems
}) {
  const files = filesAfterHistory(options.server ?? new FakeApiServer())
  await startFiles(files)
  onTestFinished(() => files.stop())
  const navigation = testNavigation()
  const panel = (list: FileListKind) => (
    <OverlayHost>
      <FilesPanel
        activeTab={null}
        files={files}
        layout={options.layout ?? 'desktop'}
        list={list}
        navigation={navigation}
        rowMenu={options.rowMenu}
      />
    </OverlayHost>
  )
  const view = await mount(panel(options.list))
  /** The link of the row whose target is `to`. */
  const link = (to: FilesTarget): HTMLElement => {
    const href = navigation.href(to)
    const found = document.querySelector<HTMLElement>(`a[href="${href}"]`)
    if (!found) throw new Error(`No row links to ${href}.`)
    return found
  }
  return {
    navigation,
    link,
    show: (list: FileListKind) => view.rerender(panel(list)),
  }
}

/** Where the open menu with this label draws: the place of its layer. */
export function placeOf(label: string) {
  const layer = byRole('menu', label).parentElement
  return { left: layer?.style.left, top: layer?.style.top }
}

/** Gives an element a box of the window, which happy-dom does not lay out. */
export function placeBox(element: HTMLElement, box: DOMRect): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => box,
  })
}

/**
 * Sends a pointer event with the primary button down, unless `init` says
 * otherwise.
 */
export function pointer(
  target: EventTarget,
  type: string,
  init: PointerEventInit,
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        button: 0,
        buttons: 1,
        ...init,
      }),
    )
  })
}
