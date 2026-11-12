import { describe, expect, it } from 'vitest'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { createApiClient } from './api/client'
import { controlledUploads, note } from './draft-files.test-support'
import { fileMark } from './draft-marks'
import { OrgModel } from './org-model'
import { testServices } from './test-kit'

const defaults = {
  repositoryId: 'storefront',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' } as const,
}
const createPath = workspacesPath(FAKE_IDS.org)

async function newForm() {
  const server = new FakeApiServer()
  const uploads = controlledUploads()
  const model = new OrgModel(
    testServices(server, {
      api: createApiClient(server.fetch, uploads.files),
    }),
    FAKE_IDS.org,
  )
  await model.reload('list')
  return { server, model, form: model.newWorkspace(null), ...uploads }
}

function oversized(name: string): File {
  const file = note(name)
  Object.defineProperty(file, 'size', { value: 25_000_001 })
  return file
}

describe('refused folders of a New workspace draft', () => {
  it('owns folder-only names, keeps cancelled picks and uploads an empty file under the same message ID', async () => {
    const { form, server, jobs, finish } = await newForm()
    const messageId = form.draft.get().messageId
    const names = ['Pictures', 'Design notes']
    expect(form.attach([], names)).toEqual([])
    names.push('Later mutation')
    expect(form.draft.get()).toMatchObject({
      text: '',
      refused: [],
      refusedFolders: ['Pictures', 'Design notes'],
      files: [],
      messageId,
    })
    expect(jobs).toEqual([])
    const beforeCancel = form.draft.get()
    expect(form.attach([])).toEqual([])
    expect(form.draft.get()).toBe(beforeCancel)
    const zero = new File([], 'empty.txt', { type: 'text/plain' })
    expect(form.attach([zero], ['Empty directory'])).toEqual(['client-2'])
    expect(form.draft.get()).toMatchObject({
      refused: [],
      refusedFolders: ['Empty directory'],
      files: [{ id: 'client-2', file: zero }],
      messageId,
    })
    expect(form.draft.get().files[0]?.file.size).toBe(0)
    expect(jobs.map((job) => job.name)).toEqual(['empty.txt'])
    form.setText(`Read ${fileMark('client-2')}`)
    await finish(0, 'empty')
    await form.send(defaults)
    const sent = await Promise.all(
      server.requests
        .filter(
          (request) =>
            request.method === 'POST' &&
            new URL(request.url).pathname === createPath,
        )
        .map((request) => request.clone().json()),
    )
    expect(sent).toMatchObject([
      {
        firstMessage: {
          id: messageId,
          text: 'Read @returned/empty',
          attachmentIds: ['empty'],
        },
      },
    ])
    expect(form.draft.get()).toMatchObject({
      refused: [],
      refusedFolders: [],
      files: [],
    })
    expect(form.draft.get().messageId).not.toBe(messageId)
  })

  it('ends folder-only data at sign-out and keeps a failed create notice until the next pick', async () => {
    const { form, model, server, jobs } = await newForm()
    form.attach([], ['Private directory'])
    model.creations.clear()
    expect(form.draft.get()).toMatchObject({ refused: [], refusedFolders: [] })
    form.setText('Create this task')
    form.attach([oversized('archive.zip')], ['Failed directory'])
    const messageId = form.draft.get().messageId
    server.json(
      'POST',
      createPath,
      { error: { code: 'unavailable', message: 'Unavailable' } },
      503,
    )
    expect(await form.send(defaults)).toBeNull()
    expect(form.draft.get()).toMatchObject({
      messageId,
      refused: ['archive.zip'],
      refusedFolders: ['Failed directory'],
    })
    form.attach([oversized('next.zip')])
    expect(form.draft.get()).toMatchObject({
      messageId,
      refused: ['next.zip'],
      refusedFolders: [],
    })
    model.creations.clear()
    expect(form.draft.get()).toMatchObject({ refused: [], refusedFolders: [] })
    expect(jobs).toEqual([])
  })
})
