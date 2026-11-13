import { describe, expect, it, vi } from 'vitest'
import type { BarAction } from '../../docs/mockups/src/components/workspace/barModel'
import { barCommands, buttonKey, type CommandKeyOf } from './barKeys'
import type { BarView } from './barView'

const push: BarAction = { kind: 'agent', action: 'push' }
const commitAndPush: BarAction = { kind: 'agent', action: 'commit-and-push' }

function viewWith(action: BarAction): BarView {
  return {
    actions: [action],
    link: null,
    message: null,
    note: null,
    tint: null,
  }
}

describe('the key of a local work button', () => {
  it('gives Push and Commit and push the one command, each with its own label', () => {
    const keyOf = vi.fn<CommandKeyOf>((command, label) => ({
      aria: 'Shift+Meta+Y',
      title: `${label} (${command})`,
    }))
    expect([
      buttonKey(push, keyOf)?.title,
      buttonKey(commitAndPush, keyOf)?.title,
    ]).toEqual(['Push (commit-and-push)', 'Commit and push (commit-and-push)'])
  })

  it('runs a click on Push with the key of Commit and push', () => {
    const onAction = vi.fn()
    const commands = barCommands(
      { view: viewWith(push), onAction },
      () => undefined,
    )
    expect(commands.map((command) => command.command)).toEqual([
      'commit-and-push',
    ])
    commands[0]?.run()
    expect(onAction).toHaveBeenCalledWith(push)
  })
})
