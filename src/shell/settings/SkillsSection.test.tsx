// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import skillListStyles from '../../ui/components/settings/SkillList.module.css'
import { ComputerModel } from '../../app/computer-model'
import { ManualDelay } from '../../app/test-kit'
import type { SkillsRepositoryLookupResponse } from '../../shared/org-settings'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { ComputerSettings } from './ComputerTab'
import { noticesOf } from './test-builds'
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

const { org } = FAKE_IDS
const saved = coreFixtures().settings.settings
const expired = {
  error: {
    code: 'github_reconnect_required',
    message: 'GitHub access expired. Sign in with GitHub again.',
  },
}

describe('the Skills section of an admin', () => {
  test('lists the skills of the saved repository, keeps them while a pasted link is not saved, saves the link as typed, and lists the skills of the saved owner/name', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('GET', skillsPath, lookup({ skills: ['databases', 'testing'] }))
    const view = await mountedTab(server)
    const loaded = {
      value: field(view).value,
      saveOff: saveOff(view),
      text: textOf(skillsOf(view).innerHTML),
      skills: listed(view),
    }
    typeText(field(view), 'https://github.com/acme/team-skills')
    const typed = { saveOff: saveOff(view), skills: listed(view) }
    server.json('PATCH', settingsPath, {
      settings: { ...saved, skillsRepository: 'acme/team-skills' },
    })
    server.json(
      'GET',
      skillsPath,
      lookup({ repository: 'acme/team-skills', skills: ['release-notes'] }),
    )
    click(byRole('button', 'Save repository', view))
    await settle()
    expect({
      loaded,
      typed,
      saved: {
        value: field(view).value,
        saveOff: saveOff(view),
        skills: listed(view),
      },
      writes: await settingsWrites(server),
      lookups: lookups(server),
    }).toEqual({
      loaded: {
        value: 'acme/agent-skills',
        saveOff: true,
        text: "Skills Agents in every workspace use the skills of a GitHub repository, and get its updates within minutes. The repository must be public. Repository Changes here apply at the next start of each workspace. Trust this skills repository Claude runs no automatic commands from any skill or custom slash command, including the workspace's own. Agents can still choose to run commands that a skill suggests. Running cloud computers keep their current trust until their next start or resume. How trust works 2 skills databases testing Save repository",
        skills: ['databases', 'testing'],
      },
      typed: { saveOff: false, skills: ['databases', 'testing'] },
      saved: {
        value: 'acme/team-skills',
        saveOff: true,
        skills: ['release-notes'],
      },
      writes: [
        {
          skillsRepository: 'https://github.com/acme/team-skills',
          trustedSkillsRepository: '',
        },
      ],
      lookups: 2,
    })
  })

  test('an empty Save removes the repository, and the section shows the empty field without a trust switch or a list', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const view = await mountedTab(server)
    server.json('PATCH', settingsPath, {
      settings: { ...saved, skillsRepository: '' },
    })
    server.json('GET', skillsPath, lookup({ repository: '' }))
    typeText(field(view), '')
    click(byRole('button', 'Save repository', view))
    await settle()
    expect({
      value: field(view).value,
      placeholder: field(view).placeholder,
      saveOff: saveOff(view),
      trust: trustOf(view),
      skills: listed(view),
      notices: noticesOf(skillsOf(view)),
      writes: await settingsWrites(server),
    }).toEqual({
      value: '',
      placeholder: 'owner/repository',
      saveOff: true,
      trust: null,
      skills: null,
      notices: [],
      writes: [{ skillsRepository: '', trustedSkillsRepository: '' }],
    })
  })

  test('saving an equivalent GitHub link settles the field and disables Save', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const view = await mountedTab(server)
    server.json('PATCH', settingsPath, { settings: saved })
    server.json('GET', skillsPath, lookup({ skills: ['updated-skill'] }))
    typeText(field(view), 'https://github.com/acme/agent-skills')
    click(byRole('button', 'Save repository', view))
    await settle()
    expect({
      value: field(view).value,
      saveOff: saveOff(view),
      skills: listed(view),
      writes: await settingsWrites(server),
      lookups: lookups(server),
    }).toEqual({
      value: 'acme/agent-skills',
      saveOff: true,
      skills: ['updated-skill'],
      writes: [
        {
          skillsRepository: 'https://github.com/acme/agent-skills',
          trustedSkillsRepository: '',
        },
      ],
      lookups: 2,
    })
  })

  test('each answer of the lookup shows its notice or its list, with the words of an admin', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const app = await startedApp(server)
    const acme = app.orgs.get().find((item) => item.id === org)
    if (!acme) throw new Error('The fake org is missing.')
    await app.org(org).reload('builds')
    const computer = new ComputerModel(app.org(org), new ManualDelay().delay)
    await computer.load()
    const view = mountScreen(
      app,
      <ComputerSettings computer={computer} org={acme} />,
    )
    // The notices in the section, and the text of the list of skills.
    const shown = async (answer: SkillsRepositoryLookupResponse) => {
      server.json('GET', settingsPath, {
        settings: { ...saved, skillsRepository: answer.repository },
      })
      await act(() => computer.load())
      server.json('GET', skillsPath, answer)
      await act(() => computer.loadSkills())
      const list = skillsOf(view).querySelector(`.${skillListStyles.skills}`)
      return {
        notices: noticesOf(skillsOf(view)),
        list: list ? textOf(list.outerHTML) : null,
      }
    }
    const notice = (text: string, danger = false, buttons: string[] = []) => ({
      notices: [{ text, danger, spinner: false, buttons }],
      list: null,
    })
    const note =
      'The repository is too large to list in full. Agents still get all of its skills.'
    expect({
      private: await shown(lookup({ notice: 'private' })),
      notFound: await shown(
        lookup({ repository: 'acme/agent-skils', notice: 'not-found' }),
      ),
      noSkills: await shown(lookup({ notice: 'no-skills' })),
      incomplete: await shown(
        lookup({ skills: ['databases'], notice: 'incomplete' }),
      ),
      cutTreeWithoutSkills: await shown(lookup({ notice: 'incomplete' })),
      failed: await shown(lookup({ notice: 'failed' })),
    }).toEqual({
      private: notice(
        'acme/agent-skills is private Agents get no skills from it. Choose a public repository, then save.',
      ),
      notFound: notice(
        'acme/agent-skils was not found GitHub has no public repository with this name. Check the name, then save.',
      ),
      noSkills: notice(
        'acme/agent-skills has no skills yet Agents use each folder with a SKILL.md file in the skills folder of the repository, or at its top level.',
      ),
      incomplete: { notices: [], list: `1 skill databases ${note}` },
      cutTreeWithoutSkills: { notices: [], list: note },
      failed: notice(
        'The list of skills did not load GitHub is not available right now. Try again',
        true,
        ['Try again'],
      ),
    })
  })

  test('an expired GitHub sign-in shows its message in place of the list, the settings still show, and Try again looks the skills up again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('GET', skillsPath, expired, 401)
    const view = await mountedTab(server)
    const failed = {
      notices: noticesOf(skillsOf(view)),
      script: byRole('textbox', 'Install software', view) !== null,
    }
    server.json('GET', skillsPath, lookup({ skills: ['testing'] }))
    click(byRole('button', 'Try again', skillsOf(view)))
    await settle()
    expect({
      failed,
      retried: { notices: noticesOf(skillsOf(view)), skills: listed(view) },
      lookups: lookups(server),
    }).toEqual({
      failed: {
        notices: [
          {
            text: 'The list of skills did not load GitHub access expired. Sign in with GitHub again. Try again',
            danger: true,
            spinner: false,
            buttons: ['Try again'],
          },
        ],
        script: true,
      },
      retried: { notices: [], skills: ['testing'] },
      lookups: 2,
    })
  })
})
