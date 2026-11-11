import { describe, expect, test } from 'vitest'
import { OpenLayers } from './layers'

describe('the open layers of the page', () => {
  test('closing the menus asks each open menu, and says whether every one closed', () => {
    const layers = new OpenLayers()
    const asked: string[] = []
    const menu = (name: string, closes: boolean) =>
      layers.addMenu(() => {
        asked.push(name)
        return closes
      })
    menu('section', true)
    const removeOwner = menu('owner during its change', false)
    const withChange = layers.closeMenus()
    removeOwner()
    const afterChange = layers.closeMenus()
    expect({ withChange, afterChange, asked }).toEqual({
      withChange: false,
      afterChange: true,
      asked: ['section', 'owner during its change', 'section'],
    })
  })

  test('notes whether a menu is open until the last open menu closes', () => {
    const layers = new OpenLayers()
    const seen: boolean[] = []
    layers.anyMenuOpen.subscribe(() => seen.push(layers.anyMenuOpen.get()))
    const removeFirst = layers.addMenu(() => true)
    const removeSecond = layers.addMenu(() => true)
    removeFirst()
    const withOne = layers.anyMenuOpen.get()
    removeSecond()
    expect({ seen, withOne, after: layers.anyMenuOpen.get() }).toEqual({
      seen: [true, false],
      withOne: true,
      after: false,
    })
  })

  test('a dialog or a sheet of another owner holds the input, and the layer of an owner does not hold it for that owner', () => {
    const layers = new OpenLayers()
    const palette = {}
    const removePalette = layers.addModal(palette)
    const own = layers.modalOpen(palette)
    const any = layers.modalOpen()
    const removeSheet = layers.addModal()
    const withSheet = layers.modalOpen(palette)
    removeSheet()
    const afterSheet = layers.modalOpen(palette)
    removePalette()
    expect({
      own,
      any,
      withSheet,
      afterSheet,
      none: layers.modalOpen(),
    }).toEqual({
      own: false,
      any: true,
      withSheet: true,
      afterSheet: false,
      none: false,
    })
  })
})
