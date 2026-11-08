import { desktopPath } from '../shared/desktop'
import { filePaths } from '../shared/files'
import { githubPaths, type BannerState } from '../shared/github'
import { DRAFT_ATTACHMENTS_PATH } from '../shared/messages'
import { previewPath, previewsPath } from '../shared/previews'
import { terminalPaths } from '../shared/terminal'
import type { FakeRouteWriter } from './fake-api-routes'
import { FAKE_IDS } from './fixtures/core'
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
}

export function fakeToolRoutes(routes: FakeRouteWriter, banner: BannerState) {
  const data = toolFixtures(banner)
  const org = FAKE_IDS.org
  const id = FAKE_IDS.workspace
  routes.json('GET', filePaths.tree(org, id), data.files)
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
  routes.json(
    'POST',
    filePaths.attachments(org, id),
    {
      attachment: {
        id: 'attachment-1',
        name: 'postcode-overlap.png',
        kind: 'image',
        mediaType: 'image/png',
        sizeBytes: 290_816,
      },
    },
    201,
  )
  routes.json(
    'POST',
    DRAFT_ATTACHMENTS_PATH,
    {
      attachment: {
        id: 'draft-attachment-1',
        name: 'postcode-overlap.png',
        kind: 'image',
        mediaType: 'image/png',
        sizeBytes: 290_816,
      },
    },
    201,
  )
  routes.json('GET', terminalPaths.connection(org, id), data.terminal)
  routes.json('GET', previewsPath(org, id), data.previews)
  routes.json('POST', previewsPath(org, id), data.preview, 201)
  routes.empty('DELETE', previewPath(org, id, FAKE_IDS.preview))
  routes.json('GET', desktopPath(org, id), data.desktop)
  fakeGitHub(routes, id, banner)
}
