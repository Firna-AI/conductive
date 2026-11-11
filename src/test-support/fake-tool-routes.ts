import type { PathState } from '../../docs/mockups/src/fixtures/maskedFiles'
import { desktopPath } from '../shared/desktop'
import { filePaths } from '../shared/files'
import { githubPaths, type BannerState } from '../shared/github'
import { attachmentUploadPath } from '../shared/messages'
import { attachmentPath } from '../shared/attachment-paths'
import { previewPath, previewsPath } from '../shared/previews'
import { terminalPaths } from '../shared/terminal'
import type { FakeRouteWriter } from './fake-api-routes'
import { FAKE_IDS } from './fixtures/core'
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
}

export function fakeToolRoutes(
  routes: FakeRouteWriter,
  banner: BannerState,
  paths: PathState = 'plain',
) {
  const data = toolFixtures(banner, paths)
  const org = FAKE_IDS.org
  const id = FAKE_IDS.workspace
  routes.json('GET', filePaths.tree(org, id), data.files)
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
  routes.json('GET', filePaths.changes(org, id), data.changes)
  routes.json('GET', filePaths.diff(org, id, FAKE_FILE_PATH), data.diff)
  // The raw file upload of the app's upload operation, at the route of each
  // target: a workspace, and the first message of a new workspace.
  for (const [fileId, target] of [
    ['attachment-1', { type: 'workspace', workspaceId: id }],
    ['draft-attachment-1', { type: 'new-workspace', messageId: '' }],
  ] as const) {
    const file = { id: fileId, name: 'postcode-overlap.png' }
    routes.json(
      'POST',
      attachmentUploadPath(org, target),
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
  routes.json('GET', terminalPaths.connection(org, id), data.terminal)
  routes.json('GET', previewsPath(org, id), data.previews)
  routes.json('POST', previewsPath(org, id), data.preview, 201)
  routes.empty('DELETE', previewPath(org, id, FAKE_IDS.preview))
  routes.json('GET', desktopPath(org, id), data.desktop)
  fakeGitHub(routes, id, banner)
}
