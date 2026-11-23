import { afterEach, beforeAll, expect, it } from 'vitest'

import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('saves skills links as names, preserves other text, removes an empty setting, and restricts writes to admins', async () => {
  fixture = await createOuterRuntime(bundle)
  const path = orgSettingsPaths.settings(OUTER_ORG)
  expect(await (await fixture.request(path)).json()).toMatchObject({
    settings: { skillsRepository: '', trustedSkillsRepository: '' },
  })
  for (const link of [
    'https://github.com/owner/skills',
    'https://github.com/owner/skills.git',
    'https://github.com/owner/skills/',
    'https://github.com/owner/skills/tree/main',
    'https://github.com/owner/skills.git/tree/main?tab=readme#skills',
    '  https://github.com/owner/skills\n',
    ' owner/skills ',
  ]) {
    const saved = await fixture.request(path, {
      method: 'PATCH',
      body: JSON.stringify({ skillsRepository: link }),
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      settings: {
        skillsRepository: 'owner/skills',
        trustedSkillsRepository: '',
      },
    })
  }
  const trusted = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      skillsRepository: 'Owner/Skills',
      trustedSkillsRepository: ' https://github.com/OWNER/SKILLS.git ',
    }),
  })
  expect(trusted.status).toBe(200)
  expect(await trusted.json()).toMatchObject({
    settings: {
      skillsRepository: 'Owner/Skills',
      trustedSkillsRepository: 'owner/skills',
    },
  })
  const memberRead = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(memberRead.status).toBe(200)
  expect(await memberRead.json()).toMatchObject({
    settings: {
      skillsRepository: 'Owner/Skills',
      trustedSkillsRepository: 'owner/skills',
    },
  })
  const denied = await fixture.request(path, {
    method: 'PATCH',
    headers: { Cookie: fixture.cookies.memberCookie },
    body: JSON.stringify({
      skillsRepository: 'member/replacement',
      trustedSkillsRepository: 'member/replacement',
    }),
  })
  expect(denied.status).toBe(403)
  expect(await denied.json()).toMatchObject({
    error: { code: 'admin_required' },
  })
  const unchanged = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      startupScript: 'echo start',
      envVars: [{ operation: 'set', name: 'SITE', value: 'example' }],
    }),
  })
  expect(await unchanged.json()).toMatchObject({
    settings: {
      skillsRepository: 'Owner/Skills',
      trustedSkillsRepository: 'owner/skills',
    },
  })
  for (const [body, repository, trust] of [
    [{ skillsRepository: 'owner/skills' }, 'owner/skills', 'owner/skills'],
    [{ skillsRepository: 'other/skills' }, 'other/skills', ''],
    [{ skillsRepository: 'owner/skills' }, 'owner/skills', ''],
    [{ trustedSkillsRepository: 'other/skills' }, 'owner/skills', ''],
    [
      {
        skillsRepository: 'other/skills',
        trustedSkillsRepository: 'other/skills',
      },
      'other/skills',
      'other/skills',
    ],
    [{ skillsRepository: '' }, '', ''],
    [{ skillsRepository: 'other/skills' }, 'other/skills', ''],
  ] as const) {
    const saved = await fixture.request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      settings: {
        skillsRepository: repository,
        trustedSkillsRepository: trust,
      },
    })
  }
  for (const [value, expected] of [
    ['not a repository', 'not a repository'],
    ['owner /name', 'owner /name'],
    ['owner/../other', 'owner/../other'],
    [
      ' \n https://github.com/invalid_owner/skills \n ',
      'https://github.com/invalid_owner/skills',
    ],
    [' \n ', ''],
    ['', ''],
  ]) {
    const saved = await fixture.request(path, {
      method: 'PATCH',
      body: JSON.stringify({
        skillsRepository: value,
        trustedSkillsRepository: value,
      }),
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      settings: { skillsRepository: expected, trustedSkillsRepository: '' },
    })
    expect(await (await fixture.request(path)).json()).toMatchObject({
      settings: { skillsRepository: expected, trustedSkillsRepository: '' },
    })
  }
  expect(
    await fixture.env.DB.prepare(
      'SELECT skills_repository FROM settings WHERE org_id = ?',
    )
      .bind(OUTER_ORG)
      .first('skills_repository'),
  ).toBe('')
  await fixture.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  const suspended = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      skillsRepository: 'suspended/skills',
      trustedSkillsRepository: 'suspended/skills',
    }),
  })
  expect(suspended.status).toBe(403)
  expect(await suspended.json()).toMatchObject({
    error: { code: 'org_suspended' },
  })
  expect(await (await fixture.request(path)).json()).toMatchObject({
    settings: { skillsRepository: '', trustedSkillsRepository: '' },
  })
  expect(
    await fixture.env.DB.prepare(
      'SELECT revision FROM settings WHERE org_id = ?',
    )
      .bind(OUTER_ORG)
      .first('revision'),
  ).toBe(1)
  expect(
    await fixture.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM image_builds',
    ).first('count'),
  ).toBe(1)
  expect(fixture.github.requests).toEqual([])
})
