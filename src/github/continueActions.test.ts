import { expect, it } from 'vitest'
import { createApiClient } from '../app/api/client'
import { workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { CONTINUE_ID, continueQuestionReply } from '../test-support/fake-bar'
import { maskedQuestionReply } from '../test-support/fake-branch-names'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { createContinueActions } from './continueActions'

const { org, workspace: id } = FAKE_IDS

it('keeps the labels of the question of Continue, and reads a question without usable labels as before', async () => {
  const server = new FakeApiServer()
  const actions = createContinueActions(createApiClient(server.fetch), {
    orgId: org,
    workspaceId: id,
  })
  const read = (reply: unknown) => {
    server.json(
      'GET',
      workspacePaths.continueResult(org, id, CONTINUE_ID),
      reply,
    )
    return actions.result(CONTINUE_ID)
  }
  const { localWork } = continueQuestionReply

  expect([
    await read(maskedQuestionReply),
    await read({
      ...continueQuestionReply,
      displayBaseBranch: 7,
      localWork: {
        ...localWork,
        displayUncommittedFiles: 'scripts/seed-[redacted].sql',
      },
    }),
    // A list of labels that does not match the real paths one to one.
    await read({
      ...continueQuestionReply,
      displayBaseBranch: '',
      localWork: { ...localWork, displayUncommittedFiles: ['a.ts', 'b.ts'] },
    }),
  ]).toEqual([
    maskedQuestionReply,
    continueQuestionReply,
    continueQuestionReply,
  ])
})
