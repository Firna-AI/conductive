import { describe, expect, it } from 'vitest'
import { controlledUploads, note } from './draft-files.test-support'
import { workspacesPath } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { createApiClient } from './api/client'
import { fileMark, literalText } from './draft-marks'
import { draftReady } from './new-workspace-draft'
import { OrgModel } from './org-model'
import { HeldRequests, testServices } from './test-kit'

const defaults = {
  repositoryId: 'storefront',
  choice: {
    agent: 'claude',
    model: 'Opus 5.5',
    effort: 'high',
    fast: false,
  } as const,
}

async function formWithUploads() {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const uploads = controlledUploads()
  const model = new OrgModel(
    testServices(server, {
      api: createApiClient(held.fetch, uploads.files),
    }),
    FAKE_IDS.org,
  )
  await model.reload('list')
  return { form: model.newWorkspace(null), model, server, held, ...uploads }
}

describe('marks in a New workspace draft', () => {
  it('returns IDs immediately, needs words outside chips and sends mentions in chip order', async () => {
    const { form, server, finish } = await formWithUploads()
    const messageId = form.draft.get().messageId
    expect(form.attach([note('one.txt'), note('two.txt')])).toEqual([
      'client-2',
      'client-3',
    ])
    form.setText(
      `${fileMark('client-3')} ${fileMark('client-2')} ${fileMark('client-3')}`,
    )
    await finish(0, 'one')
    await finish(1, 'two')
    expect(draftReady(form.draft.get())).toBe(false)
    expect(await form.send(defaults)).toBeNull()
    form.setText(`Read ${form.draft.get().text}`)
    await form.send(defaults)
    const path = workspacesPath(FAKE_IDS.org)
    const sent = await Promise.all(
      server.requests
        .filter(
          (request) =>
            request.method === 'POST' && new URL(request.url).pathname === path,
        )
        .map((request) => request.clone().json()),
    )
    expect(sent).toMatchObject([
      {
        firstMessage: {
          id: messageId,
          text: 'Read @returned/two @returned/one @returned/two',
          attachmentIds: ['two', 'one'],
        },
      },
    ])
    expect(form.draft.get()).toMatchObject({
      text: '',
      files: [],
      detached: [],
    })
  })

  it('keeps ready bytes for undo and ends detached files on send', async () => {
    const { form, jobs, finish } = await formWithUploads()
    form.attach([note()])
    const marked = fileMark('client-2')
    form.setText(`Read ${marked}`)
    await finish(0, 'one')
    const ready = form.draft.get().files[0]
    form.setText('Read ')
    expect(form.draft.get()).toMatchObject({ files: [], detached: [ready] })
    form.setText(`Read ${marked}`)
    expect({ files: form.draft.get().files, uploads: jobs.length }).toEqual({
      files: [ready],
      uploads: 1,
    })
    form.setText('Read ')
    await form.send(defaults)
    expect(form.draft.get()).toMatchObject({ files: [], detached: [] })
    expect(form.draft.get().messageId).not.toBe('client-1')
  })

  it('aborts detached jobs, fences queued generations and ignores an old reply after undo', async () => {
    const { form, jobs, finish } = await formWithUploads()
    form.attach([note('one.txt'), note('two.txt')])
    const both = `${fileMark('client-2')} ${fileMark('client-3')}`
    form.setText(both)
    form.setText(fileMark('client-2'))
    form.setText(both)
    expect(jobs.map((job) => job.name)).toEqual(['one.txt', 'two.txt'])
    await finish(0, 'one')
    expect(jobs).toHaveLength(2)
    form.setText(fileMark('client-2'))
    expect(jobs[1].signal.aborted).toBe(true)
    form.setText(both)
    await finish(1, 'stale')
    expect(form.draft.get().files[1]).toMatchObject({ state: 'uploading' })
    await finish(2, 'two')
    expect(form.draft.get().files[1]).toMatchObject({
      state: 'ready',
      attachment: { id: 'two' },
    })
  })

  it('sign-out drops attached and detached files and marks but keeps literal text encoded', async () => {
    const { form, model, jobs, finish } = await formWithUploads()
    form.attach([note('one.txt'), note('two.txt')])
    const literal = literalText('Read \uE000literal\uE001-\uE0020 ')
    form.setText(`${literal}${fileMark('client-2')} ${fileMark('client-3')}`)
    form.setText(`${literal}${fileMark('client-3')}`)
    model.creations.clear()
    expect({
      draft: form.draft.get(),
      aborted: jobs[0].signal.aborted,
    }).toMatchObject({
      draft: { text: literal, files: [], detached: [], refused: [] },
      aborted: true,
    })
    await finish(0, 'stale')
    expect(jobs).toHaveLength(1)
    expect(form.draft.get()).toMatchObject({
      text: literal,
      files: [],
      detached: [],
    })
  })

  it('clears only the captured create text and removes sent marks from a newer edit', async () => {
    const { form, held, finish } = await formWithUploads()
    form.attach([note()])
    form.setText(`Read ${fileMark('client-2')}`)
    await finish(0, 'one')
    held.hold('POST', workspacesPath(FAKE_IDS.org))
    const creating = form.send(defaults)
    const newer = literalText('Next \uE000literal\uE001-\uE0020 ')
    form.setText(`${newer}${fileMark('client-2')}`)
    held.release('POST', workspacesPath(FAKE_IDS.org))
    await creating
    expect(form.draft.get()).toMatchObject({
      text: newer,
      files: [],
      detached: [],
    })
  })
})
