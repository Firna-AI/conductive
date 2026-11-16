import { afterEach, beforeAll, expect, it } from 'vitest'

import { items, nested, record } from '../../src/app/api/parse'
import { readSection } from '../../src/app/api/read-core'
import { sectionsPath } from '../../src/shared/sections'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_SECTION,
} from '../chat/integration/outer-seed.test-support'
import { seedShellWorkspaceRuntime } from '../chat/integration/shell-api.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

async function create(runtime: OuterRuntime, body: Record<string, unknown>) {
  const response = await runtime.request(sectionsPath(OUTER_ORG), {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return {
    status: response.status,
    section:
      response.status === 201
        ? nested(record(await response.json()), 'section', readSection)
        : null,
  }
}

async function order(runtime: OuterRuntime) {
  const response = await runtime.request(sectionsPath(OUTER_ORG))
  return items(record(await response.json()), 'sections', readSection).map(
    ({ name, position }) => ({ name, position }),
  )
}

it('puts a new section directly below afterSectionId, at the end without it or when that section is gone or in another org, and refuses an anchor that is not text', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedShellWorkspaceRuntime(fixture)
  await fixture.env.DB.batch([
    fixture.env.DB.prepare(
      `INSERT INTO sections (id, org_id, name, position, created_at)
       VALUES ('infra', ?, 'Infra', 4, 1)`,
    ).bind(OUTER_ORG),
    fixture.env.DB.prepare(
      `INSERT INTO sections (id, org_id, name, position, created_at)
       VALUES ('foreign', 'other-org', 'Foreign', 0, 1)`,
    ),
  ])
  const atEnd = await create(fixture, { name: 'Last' })
  const below = await create(fixture, {
    name: 'Review',
    afterSectionId: OUTER_SECTION,
  })
  const gone = await create(fixture, {
    name: 'Orphan',
    afterSectionId: 'deleted-section',
  })
  const foreign = await create(fixture, {
    name: 'Outside',
    afterSectionId: 'foreign',
  })
  const refused = await create(fixture, { name: 'Bad', afterSectionId: 7 })

  expect({
    statuses: [
      atEnd.status,
      below.status,
      gone.status,
      foreign.status,
      refused.status,
    ],
    below: below.section?.position,
    order: await order(fixture),
  }).toEqual({
    statuses: [201, 201, 201, 201, 400],
    below: 1,
    order: [
      { name: 'General', position: 0 },
      { name: 'Review', position: 1 },
      { name: 'Infra', position: 2 },
      { name: 'Last', position: 3 },
      { name: 'Orphan', position: 4 },
      { name: 'Outside', position: 5 },
    ],
  })
})
