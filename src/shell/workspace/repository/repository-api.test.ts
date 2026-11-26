import { expect, it } from 'vitest'
import { createApiClient } from '../../../app/api/client'
import { workspacePaths } from '../../../shared/workspaces'
import { FakeApiServer } from '../../../test-support/fake-api'
import { CHANGE_ID } from '../../../test-support/fake-repository-change'
import {
  questionWith,
  repositoryQuestionReply,
} from '../../../test-support/fake-repository-names'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { createRepositoryActions } from './repository-api'

const { org, workspace: id } = FAKE_IDS

it('keeps the labels of the changed files of both lists of the question of a repository change, and reads a question without usable labels as before', async () => {
  const server = new FakeApiServer()
  const actions = createRepositoryActions(createApiClient(server.fetch), {
    orgId: org,
    workspaceId: id,
  })
  const read = (reply: unknown) => {
    server.json(
      'GET',
      workspacePaths.repositoryResult(org, id, CHANGE_ID),
      reply,
    )
    return actions.result(CHANGE_ID)
  }
  const masked = questionWith('masked-repository')
  const { work } = repositoryQuestionReply

  expect([
    await read(masked),
    await read({
      ...repositoryQuestionReply,
      work: { ...work, displayCarriedFiles: 'src/invoices/refunds.ts' },
    }),
    // A list of labels that does not match the real paths one to one.
    await read({
      ...repositoryQuestionReply,
      work: { ...work, displayCarriedFiles: ['a.ts', 'b.ts'] },
    }),
  ]).toEqual([masked, repositoryQuestionReply, repositoryQuestionReply])
})
