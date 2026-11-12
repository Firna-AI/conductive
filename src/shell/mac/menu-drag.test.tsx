// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { Store } from '../../app/store'
import { OpenLayers } from '../ui/layers'
import { MacApp, type MacWindow, type MacWindowState } from './mac-app'
import { MENU_OPEN_ATTRIBUTE, useMenuDragStop } from './menu-drag'

const macWindow: MacWindow = {
  state: new Store<MacWindowState>({
    mode: 'window',
    canGoBack: false,
    canGoForward: false,
  }),
  back: () => undefined,
  forward: () => undefined,
}

function Stop(props: { layers: OpenLayers }) {
  useMenuDragStop(props.layers)
  return null
}

function mount(layers: OpenLayers, wrap: (child: ReactNode) => ReactNode) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  onTestFinished(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })
  act(() => root.render(wrap(<Stop layers={layers} />)))
}

const marked = () => document.documentElement.hasAttribute(MENU_OPEN_ATTRIBUTE)

describe('the drag regions while a menu is open', () => {
  test('the Mac app stops them from the first open menu until the last one closes', () => {
    const layers = new OpenLayers()
    mount(layers, (child) => <MacApp window={macWindow}>{child}</MacApp>)
    const before = marked()
    let removeFirst: () => void = () => undefined
    let removeSecond: () => void = () => undefined
    act(() => {
      removeFirst = layers.addMenu(() => true)
      removeSecond = layers.addMenu(() => true)
    })
    const open = marked()
    act(() => removeFirst())
    const withOne = marked()
    act(() => removeSecond())
    expect({ before, open, withOne, after: marked() }).toEqual({
      before: false,
      open: true,
      withOne: true,
      after: false,
    })
  })

  test('a browser has no drag regions, so an open menu marks nothing', () => {
    const layers = new OpenLayers()
    mount(layers, (child) => child)
    act(() => {
      layers.addMenu(() => true)
    })
    expect(marked()).toBe(false)
  })
})
