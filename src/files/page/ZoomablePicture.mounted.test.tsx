// @vitest-environment happy-dom

import { act } from 'react'
import { beforeEach, expect, it } from 'vitest'
import imageStyles from '../../ui/components/files/ImageView.module.css'
import { OverlayHost } from '../../shell/ui/Overlay'
import { accessibleName } from '../../test-support/dom-queries'
import { layOut } from '../../test-support/layout'
import { mountRoot, press } from '../mount-test-kit'
import { LayoutRoot } from '../ui/layout'
import { PictureInTab, type ShownPicture } from './ZoomablePicture'

// A wide screenshot in a stage that fits it at a quarter of its size.
const picture: ShownPicture = {
  address: 'data:image/png;base64,AAAA',
  name: 'wide.png',
  size: { width: 1600, height: 800 },
}

beforeEach(() => layOut(`.${imageStyles.stage}`, { width: 432, height: 400 }))

async function mount(layout: 'desktop' | 'phone' = 'desktop') {
  const view = mountRoot()
  document.body.append(view.container)
  view.render(
    <OverlayHost>
      <LayoutRoot className="" label="wide.png" layout={layout}>
        <PictureInTab picture={picture} />
      </LayoutRoot>
    </OverlayHost>,
  )
  // The stand-in of `ResizeObserver` gives the size in a microtask.
  await act(async () => {})
  return view
}

/** The zoom, and whether each control of the bar is on. */
function bar(root: ParentNode) {
  const zoom = root.querySelector('[aria-label^="Zoom "][role="img"]')
  const buttons = [...root.querySelectorAll('button')].map((button) => [
    accessibleName(button),
    !button.disabled,
  ])
  return { zoom: zoom?.textContent, buttons: Object.fromEntries(buttons) }
}

function stage(root: ParentNode): HTMLElement {
  const found = root.querySelector<HTMLElement>(`.${imageStyles.stage}`)
  if (!found) throw new Error('The picture has no stage.')
  return found
}

function pictureWidth(root: ParentNode): string | undefined {
  return root.querySelector('img')?.parentElement?.style.width
}

it('fits the picture over its zoom bar, with Expand on desktop', async () => {
  const view = await mount()
  expect(bar(view.container)).toEqual({
    zoom: '25%',
    buttons: {
      'Zoom out': false,
      'Zoom in': true,
      Fit: false,
      Expand: true,
    },
  })
  // A fitted picture keeps the layout of the styles.
  expect(pictureWidth(view.container)).toBe('')
})

it('zooms with the wheel and the bar, and fits again with Fit or a double press', async () => {
  const view = await mount()
  const wheel = new WheelEvent('wheel', {
    deltaY: -100,
    cancelable: true,
    bubbles: true,
  })
  act(() => {
    stage(view.container).dispatchEvent(wheel)
  })
  // The wheel zooms, and the page itself does not scroll or zoom.
  expect(wheel.defaultPrevented).toBe(true)
  expect(bar(view.container).zoom).toBe('31%')
  expect(bar(view.container).buttons).toMatchObject({
    'Zoom out': true,
    Fit: true,
  })
  press(view.container, 'button', 'Zoom in')
  expect(bar(view.container).zoom).toBe('50%')
  expect(pictureWidth(view.container)).toBe('800px')
  press(view.container, 'button', 'Fit')
  expect(bar(view.container).zoom).toBe('25%')
  act(() => {
    stage(view.container).dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true }),
    )
  })
  expect(bar(view.container).zoom).toBe('100%')
  press(view.container, 'button', 'Zoom out')
  expect(bar(view.container).zoom).toBe('75%')
})

function pointer(
  root: ParentNode,
  type: string,
  pointerId: number,
  x: number,
  y: number,
) {
  act(() => {
    stage(root).dispatchEvent(
      new PointerEvent(type, {
        pointerId,
        clientX: x,
        clientY: y,
        button: 0,
        pointerType: 'touch',
        bubbles: true,
      }),
    )
  })
}

it('moves a zoomed picture with a drag, and zooms about the fingers of a pinch', async () => {
  const view = await mount()
  press(view.container, 'button', 'Zoom in')
  pointer(view.container, 'pointerdown', 1, 0, 0)
  pointer(view.container, 'pointermove', 1, 40, 0)
  pointer(view.container, 'pointerup', 1, 40, 0)
  const style = () => view.container.querySelector('img')?.parentElement?.style
  expect(style()?.transform).toBe(
    'translate(calc(-50% + 40px), calc(-50% + 0px))',
  )
  // Two fingers 100 px apart spread to 200 px about the same middle.
  pointer(view.container, 'pointerdown', 1, -50, 0)
  pointer(view.container, 'pointerdown', 2, 50, 0)
  pointer(view.container, 'pointermove', 2, 150, 0)
  pointer(view.container, 'pointermove', 1, -50, 0)
  // The spot under the old middle, -80 px of the picture at 50% with a
  // move of 40 px, is under the new middle, 50, at 100%: 50 - 130 = -80.
  expect(bar(view.container).zoom).toBe('100%')
  expect(style()?.width).toBe('1600px')
  expect(style()?.transform).toBe(
    'translate(calc(-50% + 130px), calc(-50% + 0px))',
  )
})

it('keeps the focus in the bar when the focused button turns off', async () => {
  const view = await mount()
  press(view.container, 'button', 'Zoom in')
  const fit = view.container.querySelector<HTMLButtonElement>(
    'button[aria-label="Fit"]',
  )
  act(() => fit?.focus())
  press(view.container, 'button', 'Fit')
  expect(fit?.disabled).toBe(true)
  expect(accessibleName(document.activeElement!)).toBe('Zoom in')
})

it('shows the picture in a large window at Expand, which Close and Escape close', async () => {
  const view = await mount()
  press(view.container, 'button', 'Zoom in')
  press(view.container, 'button', 'Expand')
  const dialog = document.querySelector('[role="dialog"]')
  expect(dialog && accessibleName(dialog)).toBe('wide.png')
  expect(dialog?.querySelector('h2')?.textContent).toBe('wide.png')
  // The window fits the picture again, and its bar has no Expand.
  expect(bar(dialog!).buttons).toEqual({
    Close: true,
    'Zoom out': false,
    'Zoom in': true,
    Fit: false,
  })
  // The picture in the tab keeps its zoom.
  expect(bar(view.container).zoom).toBe('50%')
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  press(view.container, 'button', 'Expand')
  press(document.body, 'button', 'Close')
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})

it('has no Expand on a phone, where the picture fills the screen already', async () => {
  const view = await mount('phone')
  expect(Object.keys(bar(view.container).buttons)).toEqual([
    'Zoom out',
    'Zoom in',
    'Fit',
  ])
})
