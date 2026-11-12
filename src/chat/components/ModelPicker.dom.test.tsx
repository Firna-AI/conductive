// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { AgentModel } from '../../shared/agents'
import { accessibleName, byRole } from '../../test-support/dom-queries'
import { mount, press } from '../../test-support/mount'
import { ModelPicker } from './ModelPicker'

const models: readonly AgentModel[] = [
  {
    agent: 'claude',
    model: 'opus',
    label: 'Opus 5.5',
    efforts: ['low', 'high'],
  },
  {
    agent: 'claude',
    model: 'sonnet',
    label: 'Sonnet 5.5',
    efforts: ['low', 'high'],
  },
  {
    agent: 'codex',
    model: 'sol',
    label: 'GPT-6.1 Sol',
    efforts: ['low', 'high'],
  },
]

/**
 * What a screen reader says for each choice of the open picker. A browser
 * puts a space between the parts of a row, so the parts join with one.
 */
function spokenChoices(): string[] {
  const menu = byRole('menu', 'Model and effort')
  return Array.from(menu.querySelectorAll('[role="menuitemradio"]'), (item) =>
    Array.from(item.children, accessibleName).filter(Boolean).join(' '),
  )
}

describe('the model picker of a session with messages', () => {
  it('says New session for each model of the other agent only', async () => {
    await mount(
      <ModelPicker
        choice={{ agent: 'claude', model: 'opus', effort: 'high', fast: false }}
        models={models}
        onChoose={() => undefined}
        sessionAgent="claude"
      />,
    )
    await press(byRole('button', 'Model and effort: Opus 5.5, High'))
    expect(spokenChoices()).toEqual([
      'Opus 5.5',
      'Sonnet 5.5',
      'GPT-6.1 Sol New session',
      'Low',
      'High',
    ])
  })
})
