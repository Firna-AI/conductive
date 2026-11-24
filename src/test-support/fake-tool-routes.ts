import type { PathState } from '../../docs/mockups/src/fixtures/maskedFiles'
import { sandboxNotAnswering } from '../../docs/mockups/src/fixtures/previews'
import { desktopPath } from '../shared/desktop'
import { filePaths } from '../shared/files'
import { githubPaths, type BannerState } from '../shared/github'
import {
  ATTACHMENT_PART_BYTES,
  attachmentUploadCompletePath,
  attachmentUploadPartPath,
  attachmentUploadStartPath,
  type AttachmentUploadPart,
  type StartAttachmentUploadResponse,
} from '../shared/messages'
import { attachmentPath } from '../shared/attachment-paths'
import {
  FILE_SERVER_UNAVAILABLE,
  filesPreviewPath,
  previewPath,
  previewsPath,
} from '../shared/previews'
import { servicePaths } from '../shared/services'
import type { FakeRouteWriter } from './fake-api-routes'
import type { FakeWorkspaceEvents } from './fake-events'
import { fakeFileLists } from './fake-file-lists'
import { FAKE_IDS, FAKE_TIME } from './fixtures/core'
import {
  MASKED_GONE_PATH,
  MASKED_SEED_PATH,
  maskedSeedDiff,
  maskedSeedFile,
} from './fixtures/masked-paths'
import { FAKE_FILE_PATH, toolFixtures } from './fixtures/tools'

/**
 * The GitHub bar and the checks of one workspace, in a state of the bar.
 * `branch` names the branch of another workspace than the default one.
 */
export function fakeGitHub(
  routes: FakeRouteWriter,
  workspaceId: string,
  banner: BannerState,
  branch?: string,
): void {
  const data = toolFixtures(banner)
  const bar = branch
    ? { ...data.banner, banner: { ...data.banner.banner, branch } }
    : data.banner
  routes.json('GET', githubPaths.banner(FAKE_IDS.org, workspaceId), bar)
  routes.json('GET', githubPaths.checks(FAKE_IDS.org, workspaceId), data.checks)
  // No state is stored before the first read, so the views load first.
  routes.json('GET', githubPaths.stored(FAKE_IDS.org, workspaceId), {
    state: null,
  })
  routes.json('GET', githubPaths.capabilities(FAKE_IDS.org, workspaceId), {
    canWrite: true,
    mergeMethod: 'squash',
  })
  routes.json(
    'POST',
    githubPaths.merge(FAKE_IDS.org, workspaceId),
    {
      state: 'pending',
      mergeId: `merge-${workspaceId}`,
    },
    202,
  )
  routes.json(
    'GET',
    githubPaths.mergeResult(FAKE_IDS.org, workspaceId, `merge-${workspaceId}`),
    { state: 'merged' },
  )
  routes.json('POST', githubPaths.ready(FAKE_IDS.org, workspaceId), {
    state: 'ready',
  })
}

/**
 * How the fake API answers the open of the files preview: with the files
 * preview, as `open` does by default, with the refusal of a runner that
 * announced no file server, with the failure of a cloud computer that did
 * not answer, or with the refusal while the cloud computer does not run.
 */
export type FakeFilesPreview =
  'open' | 'older-software' | 'failed' | 'not-ready'

/** Sets the reply of the open of the files preview of the fake workspace. */
export function fakeFilesPreview(
  routes: FakeRouteWriter,
  reply: FakeFilesPreview,
): void {
  const path = filesPreviewPath(FAKE_IDS.org, FAKE_IDS.workspace)
  switch (reply) {
    case 'open':
      routes.json('POST', path, toolFixtures().filesPreview, 201)
      return
    case 'older-software':
      routes.json(
        'POST',
        path,
        {
          error: {
            code: FILE_SERVER_UNAVAILABLE,
            message:
              'The cloud computer software cannot serve files. Restart the workspace.',
          },
        },
        409,
      )
      return
    case 'failed':
      routes.json(
        'POST',
        path,
        {
          error: {
            code: 'sandbox_unavailable',
            message: sandboxNotAnswering,
          },
        },
        502,
      )
      return
    case 'not-ready':
      routes.json(
        'POST',
        path,
        {
          error: {
            code: 'sandbox_not_ready',
            message: 'Open the workspace to start its cloud computer.',
          },
        },
        409,
      )
      return
  }
}

export function fakeToolRoutes(
  routes: FakeRouteWriter,
  events: FakeWorkspaceEvents,
  banner: BannerState,
  paths: PathState = 'plain',
) {
  const data = toolFixtures(banner, paths)
  const org = FAKE_IDS.org
  const id = FAKE_IDS.workspace
  fakeFileLists(routes, events)
  if (paths === 'masked') {
    const seed = MASKED_SEED_PATH
    routes.json('GET', filePaths.content(org, id, seed), maskedSeedFile())
    routes.json('GET', filePaths.diff(org, id, seed), maskedSeedDiff())
    routes.json(
      'GET',
      filePaths.content(org, id, MASKED_GONE_PATH),
      { error: { code: 'file_not_found', message: 'The file is not there.' } },
      404,
    )
  }
  routes.json('GET', filePaths.content(org, id, FAKE_FILE_PATH), data.content)
  routes.response(
    'GET',
    filePaths.download(org, id, FAKE_FILE_PATH),
    new Response(data.content.content, {
      headers: {
        'Content-Type': data.content.mediaType,
        'Content-Disposition': 'attachment; filename="AddressForm.tsx"',
      },
    }),
  )
  routes.json('GET', filePaths.diff(org, id, FAKE_FILE_PATH), data.diff)
  // The upload in parts of the app's upload operation, at the routes of each
  // target: a workspace, and the first message of a new workspace. Each
  // start gives the same upload of one part, and its complete call the file.
  for (const [fileId, target] of [
    ['attachment-1', { type: 'workspace', workspaceId: id }],
    ['draft-attachment-1', { type: 'new-workspace', messageId: '' }],
  ] as const) {
    const file = { id: fileId, name: 'postcode-overlap.png' }
    const upload = FAKE_IDS.upload
    routes.json(
      'POST',
      attachmentUploadStartPath(org, target),
      {
        uploadId: upload,
        partSizeBytes: ATTACHMENT_PART_BYTES,
        partCount: 1,
      } satisfies StartAttachmentUploadResponse,
      201,
    )
    routes.json('PUT', attachmentUploadPartPath(org, target, upload, 1), {
      partNumber: 1,
      etag: 'etag-1',
    } satisfies AttachmentUploadPart)
    routes.json(
      'POST',
      attachmentUploadCompletePath(org, target, upload),
      attachmentPath(file).then((path) => ({
        attachment: {
          ...file,
          path,
          kind: 'image',
          mediaType: 'image/png',
          sizeBytes: 290_816,
        },
      })),
      201,
    )
  }
  routes.handle('GET', previewsPath(org, id), async () =>
    Response.json({
      previews: data.previews.previews.filter(
        (preview) =>
          preview.expiresAt > FAKE_TIME &&
          !events.previewRevoked(id, preview.id),
      ),
    }),
  )
  routes.json('POST', previewsPath(org, id), data.preview, 201)
  fakeFilesPreview(routes, 'open')
  routes.empty('DELETE', previewPath(org, id, FAKE_IDS.preview))
  // Software without services, as before, unless a test serves a list.
  routes.json('GET', servicePaths.catalogue(org, id), { state: 'unsupported' })
  routes.json('GET', desktopPath(org, id), data.desktop)
  fakeGitHub(routes, id, banner)
}
