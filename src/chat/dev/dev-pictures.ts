import { registerFile } from '../../files/dev/dev-fixtures'
import type { FileEntry } from '../../shared/generated/FileEntry'
import type { FakeApiServer } from '../../test-support/fake-api'

/**
 * The screenshots of the context folder that the scripted agent shows with
 * `answer=pictures`. `lost` is in the tree, but the fake has no file for
 * it, so its read fails, as for a file that the cloud computer no longer
 * has. Development only.
 */
export const devShots = {
  before: '.context/checkout-before.png',
  after: '.context/checkout-after.png',
  lost: '.context/checkout-old.png',
} as const

/** The size of a phone screenshot, in CSS px. */
const width = 390
const height = 844

/** A field of the checkout form: its label, its text, and its top edge. */
function field(
  context: CanvasRenderingContext2D,
  label: string,
  text: string,
  top: number,
): void {
  context.fillStyle = '#6b7280'
  context.font = '13px sans-serif'
  context.fillText(label, 24, top)
  context.strokeStyle = '#d1d5db'
  context.strokeRect(24, top + 8, width - 48, 40)
  context.fillStyle = '#111827'
  context.font = '15px sans-serif'
  context.fillText(text, 36, top + 34)
}

/**
 * Draws the checkout form of a phone, with its list of address suggestions:
 * over the postcode field before the fix, and under it after the fix.
 */
function drawCheckout(fixed: boolean): Uint8Array<ArrayBuffer> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return new Uint8Array()
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#111827'
  context.font = 'bold 18px sans-serif'
  context.fillText('Checkout', 24, 64)
  context.font = 'bold 15px sans-serif'
  context.fillText('Shipping address', 24, 112)
  field(context, 'Full name', 'Ana Costa', 140)
  field(context, 'Address', '12 Rua das Flores', 210)
  field(context, 'Postcode', '1200-195', 280)
  const listTop = fixed ? 336 : 258
  context.fillStyle = '#f9fafb'
  context.fillRect(24, listTop, width - 48, 132)
  context.strokeStyle = '#d1d5db'
  context.strokeRect(24, listTop, width - 48, 132)
  context.fillStyle = '#374151'
  context.font = '14px sans-serif'
  const towns = ['Lisboa', 'Porto', 'Braga']
  towns.forEach((town, index) => {
    context.fillText(
      `12 Rua das Flores, ${town}`,
      36,
      listTop + 30 + index * 40,
    )
  })
  context.fillStyle = '#111827'
  context.fillRect(24, height - 96, width - 48, 48)
  context.fillStyle = '#ffffff'
  context.font = 'bold 15px sans-serif'
  context.fillText('Continue to payment', 118, height - 66)
  const base64 = canvas.toDataURL('image/png').split(',')[1] ?? ''
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

/** The entry of a file of the context folder in the tree. */
function entryOf(path: string): FileEntry {
  const name = path.slice(path.lastIndexOf('/') + 1)
  return { path, name, kind: 'file', change: null }
}

/**
 * Sets the replies of the screenshots on the fake server, and gives their
 * entries for the tree. The page draws them in the browser, so the fixture
 * holds no picture bytes.
 */
export function registerDevShots(server: FakeApiServer): FileEntry[] {
  registerFile(server, devShots.before, drawCheckout(false), 'image/png')
  registerFile(server, devShots.after, drawCheckout(true), 'image/png')
  return Object.values(devShots).map(entryOf)
}
