import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { prepareCreationRequest } from './create-request'
import { claimCreation, recordedCreationJob } from './creation-claims'
import { FIRST_MESSAGE } from './durable-test-support'
import { seedPublishedImage } from './published-image-test-support'

const backend = setupBackendTests()

it.each([
  {
    kind: 'omitted',
    input: {},
    start: 'published-next',
    base: null,
  },
  {
    kind: 'named',
    input: { startBranch: 'main', baseBranch: 'main' },
    start: 'main',
    base: 'main',
  },
])(
  'keeps $kind branches consistent when publication changes before the creation claim',
  async ({ input, start, base }) => {
    const h = backend()
    const candidate = await prepareCreationRequest(
      h.runtime,
      h.org.id,
      h.user,
      h.user,
      {
        repositoryId: h.repositoryId,
        firstMessage: FIRST_MESSAGE,
        ...input,
      },
    )
    await seedPublishedImage(h.runtime.env.DB, {
      orgId: h.org.id,
      buildId: 'next-publication',
      imageName: 'next-image',
      repositories: [
        {
          id: h.repositoryId,
          orgId: h.org.id,
          fullName: 'example/repository',
          defaultBranch: 'published-next',
        },
      ],
      software: SOFTWARE,
      now: TEST_TIME + 1,
    })
    const key = {
      orgId: h.org.id,
      senderUserId: h.user.id,
      messageId: FIRST_MESSAGE.id,
    }
    const claim = await claimCreation(h.runtime.env.DB, key, candidate)
    const recorded = await recordedCreationJob(
      h.runtime.env.DB,
      key,
      claim.id,
      FIRST_MESSAGE.text,
    )
    expect(recorded).toMatchObject({
      imageName: 'next-image',
      defaultBranch: 'published-next',
      startBranch: start,
      baseBranch: base ?? undefined,
    })
    expect(
      await h.runtime.env.DB.prepare(
        'SELECT start_branch AS startBranch, base_branch AS baseBranch FROM workspace_creation_plans WHERE workspace_id = ?',
      )
        .bind(claim.id)
        .first(),
    ).toEqual({ startBranch: start, baseBranch: base })
  },
)
