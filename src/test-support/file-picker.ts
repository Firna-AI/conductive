import { act } from 'react'
import { queryAllByRole } from './dom-queries'
import { press } from './mount'

/**
 * Picks files with the Attach files button of a composer in `root`, as a
 * member does. The press moves the focus to the button, as Chrome does, and
 * the button opens the file picker. The picker then gives its input the
 * files and fires its change event, as a browser does after a pick.
 * A notice can offer the same action, so take the first matching button.
 */
export async function pickFiles(
  root: HTMLElement,
  files: readonly File[],
): Promise<void> {
  const [button] = queryAllByRole('button', 'Attach files', root)
  if (!button) throw new Error('The composer has no Attach files button.')
  act(() => button.focus())
  await press(button)
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('The composer has no file picker.')
  const chosen = new DataTransfer()
  for (const file of files) chosen.items.add(file)
  act(() => {
    input.files = chosen.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
