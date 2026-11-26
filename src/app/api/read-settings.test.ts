import { expect, it } from 'vitest'

import { parseSettings } from '../../members/api/parseSettings'
import { readSettings } from './read-settings'

it('reads named repository trust and treats older settings replies as untrusted in both clients', () => {
  const settings = {
    installScript: '',
    startupScript: '',
    skillsRepository: 'Owner/Skills',
    envVars: [],
    updatedAt: 1,
  }
  for (const read of [readSettings, parseSettings]) {
    expect(read({ settings })).toMatchObject({
      skillsRepository: 'Owner/Skills',
      trustedSkillsRepository: '',
    })
    expect(
      read({
        settings: { ...settings, trustedSkillsRepository: 'owner/skills' },
      }),
    ).toMatchObject({ trustedSkillsRepository: 'owner/skills' })
  }
})
