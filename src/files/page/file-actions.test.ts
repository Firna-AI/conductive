import { expect, it } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { clientFor, deferred } from '../files-test-kit'
import { fetchedDownload, type SaveFile } from './fetched-download'
import { FileActions, type FileActionTargets } from './file-actions'

const path = 'docs/README.md'

function serverWithDownload(reply: Response): FakeApiServer {
  const server = new FakeApiServer()
  const route = filePaths.download(FAKE_IDS.org, FAKE_IDS.workspace, path)
  server.response('GET', route, reply)
  return server
}

/** Copy, and the fetched download of the development page, recorded. */
function recording(server: FakeApiServer, save?: SaveFile) {
  const copied: string[] = []
  const saved: { name: string; text: Promise<string> }[] = []
  const targets: FileActionTargets = {
    writeText: async (text) => {
      copied.push(text)
    },
    download: fetchedDownload(server.fetch, (file, name) => {
      save?.(file, name)
      saved.push({ name, text: file.text() })
    }),
  }
  const actions = new FileActions(clientFor(server.fetch), targets, path)
  return { actions, copied, saved }
}

it('copies the text it gets, and the fetched download saves the reply under the file name', async () => {
  const server = serverWithDownload(new Response('# Docs\n'))
  const { actions, copied, saved } = recording(server)
  await actions.copy('# Docs\n')
  expect(copied).toEqual(['# Docs\n'])
  expect(actions.getSnapshot()).toEqual({
    status: 'copied',
    downloading: false,
  })
  await actions.download()
  expect(saved.map((file) => file.name)).toEqual(['README.md'])
  expect(await saved[0].text).toBe('# Docs\n')
  expect(actions.getSnapshot()).toEqual({ status: null, downloading: false })
})

it('reports a download that fails, and stops showing it as busy', async () => {
  const gone = Response.json(
    { error: { code: 'file_not_found', message: 'Gone.' } },
    { status: 404 },
  )
  const cases: { name: string; reply: Response; save?: SaveFile }[] = [
    { name: 'the route answers with an error', reply: gone },
    {
      name: 'the save throws',
      reply: new Response('# Docs\n'),
      save: () => {
        throw new Error('The browser blocked the download.')
      },
    },
  ]
  for (const { name, reply, save } of cases) {
    const { actions, saved } = recording(serverWithDownload(reply), save)
    await expect(actions.download(), name).resolves.toBeUndefined()
    expect(actions.getSnapshot(), name).toEqual({
      status: 'download-failed',
      downloading: false,
    })
    expect(saved, name).toEqual([])
  }
})

it('lets only the newest download of a file end its busy state', async () => {
  const replies = [deferred<boolean>(), deferred<boolean>()]
  let call = 0
  const targets: FileActionTargets = {
    writeText: async () => {},
    download: () => replies[call++].promise,
  }
  const client = clientFor(new FakeApiServer().fetch)
  const actions = new FileActions(client, targets, path)
  const first = actions.download()
  const second = actions.download()
  replies[0].resolve(false)
  await first
  expect(actions.getSnapshot()).toEqual({ status: null, downloading: true })
  replies[1].resolve(true)
  await second
  expect(actions.getSnapshot()).toEqual({ status: null, downloading: false })
})
