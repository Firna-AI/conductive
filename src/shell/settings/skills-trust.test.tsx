// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import { byRole, shownToasts } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import {
  field,
  listed,
  lookup,
  lookups,
  mountedTab,
  saveOff,
  settingsPath,
  settingsWrites,
  skillsOf,
  skillsPath,
  trustOf,
} from './test-skills'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** Acme saved acme/agent-skills with no trusted repository, as each repository starts. */
const saved = coreFixtures().settings.settings
const on =
  "Claude can run automatic commands from this repository's skills, including future updates, with the workspace's access."
const off =
  "Claude runs no automatic commands from any skill or custom slash command, including the workspace's own. Agents can still choose to run commands that a skill suggests."
const replaced = 'A new repository starts untrusted.'
const note =
  'Running cloud computers keep their current trust until their next start or resume. How trust works'

/** Presses the trust switch of an admin. */
function pressTrust(view: HTMLElement): void {
  click(byRole('switch', 'Trust this skills repository', view))
}

describe('the trust choice of an admin', () => {
  test('the switch shows off for a named repository and hides for other text, an edit of the text turns it off, and Save sends the grant with the exact text, then shows the trusted repository that the Worker saved', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('GET', skillsPath, lookup({ skills: ['databases', 'testing'] }))
    const view = await mountedTab(server)
    const guide = byRole('link', 'How trust works', skillsOf(view))
    const loaded = {
      trust: trustOf(view),
      saveOff: saveOff(view),
      guide: [guide.getAttribute('href'), guide.getAttribute('target')],
    }
    pressTrust(view)
    const turnedOn = { trust: trustOf(view), saveOff: saveOff(view) }
    typeText(field(view), 'agent-skills')
    const noName = trustOf(view)
    typeText(field(view), 'https://github.com/Acme/Team-Skills')
    const replacement = { trust: trustOf(view), skills: listed(view) }
    pressTrust(view)
    const trustedDraft = trustOf(view)?.on
    server.json('PATCH', settingsPath, {
      settings: {
        ...saved,
        skillsRepository: 'Acme/Team-Skills',
        trustedSkillsRepository: 'acme/team-skills',
      },
    })
    server.json(
      'GET',
      skillsPath,
      lookup({ repository: 'Acme/Team-Skills', skills: ['release-notes'] }),
    )
    click(byRole('button', 'Save repository', view))
    await settle()
    expect({
      loaded,
      turnedOn,
      noName,
      replacement,
      trustedDraft,
      writes: await settingsWrites(server),
      saved: {
        value: field(view).value,
        trust: trustOf(view),
        saveOff: saveOff(view),
        skills: listed(view),
      },
    }).toEqual({
      loaded: {
        trust: { on: false, hint: `${off} ${note}` },
        saveOff: true,
        guide: [
          'https://conductive.build/docs/cloud-computer#trust-a-skills-repository',
          '_blank',
        ],
      },
      turnedOn: { trust: { on: true, hint: `${on} ${note}` }, saveOff: false },
      noName: null,
      replacement: {
        trust: { on: false, hint: `${replaced} ${off} ${note}` },
        skills: ['databases', 'testing'],
      },
      trustedDraft: true,
      writes: [
        {
          skillsRepository: 'https://github.com/Acme/Team-Skills',
          trustedSkillsRepository: 'https://github.com/Acme/Team-Skills',
        },
      ],
      saved: {
        value: 'Acme/Team-Skills',
        trust: { on: true, hint: `${on} ${note}` },
        saveOff: true,
        skills: ['release-notes'],
      },
    })
  })

  test('a failed Save keeps the trust choice in the draft and the saved list, and the retry settles to the untrusted repository of an answer without a grant', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('GET', skillsPath, lookup({ skills: ['databases', 'testing'] }))
    const view = await mountedTab(server)
    server.json(
      'PATCH',
      settingsPath,
      { error: { code: 'internal', message: 'The request failed.' } },
      500,
    )
    pressTrust(view)
    click(byRole('button', 'Save repository', view))
    await settle()
    const failed = {
      trust: trustOf(view)?.on,
      saveOff: saveOff(view),
      skills: listed(view),
      lookups: lookups(server),
      toasts: shownToasts().map((toast) => toast.textContent),
    }
    // The Worker saves no grant, so its answer names no trusted repository.
    server.json('PATCH', settingsPath, { settings: saved })
    click(byRole('button', 'Save repository', view))
    await settle()
    const grant = {
      skillsRepository: 'acme/agent-skills',
      trustedSkillsRepository: 'acme/agent-skills',
    }
    expect({
      failed,
      settled: {
        trust: trustOf(view),
        saveOff: saveOff(view),
        lookups: lookups(server),
      },
      writes: await settingsWrites(server),
    }).toEqual({
      failed: {
        trust: true,
        saveOff: false,
        skills: ['databases', 'testing'],
        lookups: 1,
        toasts: ['The skills repository was not savedThe request failed.'],
      },
      settled: {
        trust: { on: false, hint: `${off} ${note}` },
        saveOff: true,
        lookups: 2,
      },
      writes: [grant, grant],
    })
  })

  test('a repository typed while a trusting Save waits stays in the draft with the switch off, and the next Save sends it without a grant', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const view = await mountedTab(server, { fetch: held.fetch })
    server.json('PATCH', settingsPath, {
      settings: { ...saved, trustedSkillsRepository: 'acme/agent-skills' },
    })
    held.holdAnswer('PATCH', settingsPath)
    pressTrust(view)
    click(byRole('button', 'Save repository', view))
    typeText(field(view), 'acme/team-skills')
    held.release('PATCH', settingsPath)
    await settle()
    const kept = {
      value: field(view).value,
      trust: trustOf(view),
      saveOff: saveOff(view),
    }
    server.json('PATCH', settingsPath, {
      settings: { ...saved, skillsRepository: 'acme/team-skills' },
    })
    click(byRole('button', 'Save repository', view))
    await settle()
    expect({ kept, writes: await settingsWrites(server) }).toEqual({
      kept: {
        value: 'acme/team-skills',
        trust: { on: false, hint: `${replaced} ${off} ${note}` },
        saveOff: false,
      },
      writes: [
        {
          skillsRepository: 'acme/agent-skills',
          trustedSkillsRepository: 'acme/agent-skills',
        },
        { skillsRepository: 'acme/team-skills', trustedSkillsRepository: '' },
      ],
    })
  })
})
