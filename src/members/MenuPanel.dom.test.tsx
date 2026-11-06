// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { accessibleName } from '../test-support/dom-queries'
import { mount, MOUNTED_TEST_TIMEOUT, pressKey } from '../test-support/mount'
import { MenuPanel, type MenuChoice } from './ui/MenuPanel'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const people: MenuChoice<string>[] = [
  { value: 'cal', label: 'Cal' },
  { value: 'priya', label: 'Priya Raman' },
  { value: 'jonas', label: 'Jonas Weber' },
]

function panel(props: {
  choices: MenuChoice<string>[]
  selected: string
  status?: string
}) {
  return (
    <MenuPanel
      busy={null}
      choices={props.choices}
      label="Owner"
      onSelect={() => undefined}
      selected={props.selected}
      status={props.status}
    />
  )
}

function focusedChoice(): string | null {
  const active = document.activeElement
  return active?.getAttribute('role') === 'menuitemradio'
    ? accessibleName(active)
    : null
}

it('focuses_the_marked_choice_when_the_choices_come_after_the_status', async () => {
  const view = await mount(
    panel({ choices: [], selected: 'cal', status: 'Loading the members' }),
  )
  expect(focusedChoice()).toBeNull()

  await view.rerender(panel({ choices: people, selected: 'cal' }))
  expect(focusedChoice()).toBe('Cal')
  await pressKey('ArrowDown')
  expect(focusedChoice()).toBe('Priya Raman')

  // A new marked choice does not take the focus from a choice in the list.
  await view.rerender(panel({ choices: people, selected: 'jonas' }))
  expect(focusedChoice()).toBe('Priya Raman')
})
