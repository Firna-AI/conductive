// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { listed, lookup, mountedTab, skillsOf, skillsPath } from './test-skills'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the Skills section of a member', () => {
  test('a member reads the saved repository, its trust choice, and its skills as text, without a field, a switch, or Save, and Try again looks up a list that did not load', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ role: 'member' })
    server.json(
      'GET',
      skillsPath,
      { error: { code: 'internal', message: 'The request failed.' } },
      500,
    )
    const view = await mountedTab(server)
    const failed = textOf(skillsOf(view).innerHTML)
    server.json('GET', skillsPath, lookup({ skills: ['databases', 'testing'] }))
    click(byRole('button', 'Try again', skillsOf(view)))
    await settle()
    const section = skillsOf(view)
    expect({
      failed,
      text: textOf(section.innerHTML),
      controls: section.querySelectorAll('input, button').length,
      skills: listed(view),
    }).toEqual({
      failed:
        "Skills Agents in every workspace use the skills of a GitHub repository, and get its updates within minutes. The repository must be public. Repository acme/agent-skills Trust Not trusted Claude runs no automatic commands from any skill or custom slash command, including the workspace's own. Agents can still choose to run commands that a skill suggests. Running cloud computers keep their current trust until their next start or resume. How trust works The list of skills did not load The request failed. Try again",
      text: "Skills Agents in every workspace use the skills of a GitHub repository, and get its updates within minutes. The repository must be public. Repository acme/agent-skills Trust Not trusted Claude runs no automatic commands from any skill or custom slash command, including the workspace's own. Agents can still choose to run commands that a skill suggests. Running cloud computers keep their current trust until their next start or resume. How trust works 2 skills databases testing",
      controls: 0,
      skills: ['databases', 'testing'],
    })
  })
})
