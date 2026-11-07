// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { fakeLiteralCommands } from '../../test-support/fixtures/devices'
import { mount, MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { LiteralText } from './LiteralText'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const spoof = fakeLiteralCommands[1]

/** Selects the whole content of one node, as a person does with the pointer. */
function selectContents(node: Node): void {
  const range = document.createRange()
  range.selectNodeContents(node)
  const selection = document.getSelection()
  if (!selection) throw new Error('The page has no selection')
  selection.removeAllRanges()
  selection.addRange(range)
}

/** Sends a copy at the body, as Chrome does for text that takes no focus. */
function copy(): { prevented: boolean; text: string } {
  const clipboardData = new DataTransfer()
  const event = new ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true,
    clipboardData,
  })
  document.body.dispatchEvent(event)
  return {
    prevented: event.defaultPrevented,
    text: clipboardData.getData('text/plain'),
  }
}

describe('LiteralText', () => {
  it('copies a selection inside it as the original text, and leaves any other copy native', async () => {
    const view = await mount(
      <p>
        Before <LiteralText text={spoof} /> after
      </p>,
    )
    const code = view.container.querySelector('code')
    const paragraph = view.container.querySelector('p')
    if (!code || !paragraph) throw new Error('The literal is not mounted')

    selectContents(code)
    expect(copy()).toEqual({ prevented: true, text: spoof })

    selectContents(paragraph)
    expect(copy()).toEqual({ prevented: false, text: '' })
  })
})
