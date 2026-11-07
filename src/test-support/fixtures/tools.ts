import {
  changedFiles,
  fileTree,
} from '../../../docs/mockups/src/fixtures/files'
import {
  checksByState,
  pullRequest,
} from '../../../docs/mockups/src/fixtures/pullRequests'
import type { DesktopResponse } from '../../shared/desktop'
import type {
  ChangesResponse,
  DiffResponse,
  FileEntry,
  FileResponse,
  FileTreeResponse,
} from '../../shared/files'
import type {
  BannerState,
  GitHubBannerResponse,
  GitHubCheck,
  GitHubChecksResponse,
} from '../../shared/github'
import {
  previewPath,
  type PreviewResponse,
  type PreviewsResponse,
} from '../../shared/previews'
import { terminalPaths, type TerminalResponse } from '../../shared/terminal'
import { FAKE_IDS, FAKE_ORIGIN, FAKE_TIME } from './core'

export const FAKE_FILE_PATH = 'src/app/checkout/AddressForm.tsx'
export const fakeTerminalOutput =
  'storefront (calummoore/checkout-autocomplete) $ npm run dev\r\nLocal: http://localhost:3000\r\nReady\r\n'

export function toolFixtures(bannerState: BannerState = 'ready-to-merge') {
  const parents: string[] = []
  const files: FileTreeResponse = {
    revision: 1,
    entries: fileTree.map((entry): FileEntry => {
      parents.length = entry.depth
      const path = [...parents, entry.name].join('/')
      if (entry.folder) parents[entry.depth] = entry.name
      return {
        path,
        name: entry.name,
        kind: entry.folder ? 'directory' : 'file',
        change: entry.change ?? null,
      }
    }),
  }
  const content: FileResponse = {
    path: FAKE_FILE_PATH,
    mediaType: 'text/typescript',
    encoding: 'utf-8',
    content:
      'export function AddressForm() {\n  return <form aria-label="Address" />\n}\n',
    sizeBytes: 0,
  }
  content.sizeBytes = new TextEncoder().encode(content.content).byteLength
  const changes: ChangesResponse = {
    baseBranch: 'main',
    files: changedFiles.map((file) => ({
      ...file,
      uncommitted: file.path === FAKE_FILE_PATH,
    })),
    summary: { files: 5, added: 158, removed: 48 },
  }
  const diff: DiffResponse = {
    path: FAKE_FILE_PATH,
    baseBranch: 'main',
    oldContent: 'export function AddressForm() {}\n',
    newContent: content.content,
    binary: false,
    patch:
      '@@ -1 +1,3 @@\n-export function AddressForm() {}\n+export function AddressForm() {\n+  return <form aria-label="Address" />\n+}\n',
  }
  const banner: GitHubBannerResponse = {
    banner: {
      branch: 'calummoore/checkout-autocomplete',
      baseBranch: 'main',
      updatedAt: FAKE_TIME,
      ...(bannerState === 'none' || bannerState === 'no-commits'
        ? {
            state: bannerState,
            pullRequest: null,
            createPullRequestUrl:
              bannerState === 'none'
                ? 'https://github.com/acme/storefront/compare/main...calummoore:checkout-autocomplete?expand=1'
                : null,
          }
        : {
            state: bannerState,
            pullRequest,
            // A missing approval is the common reason that GitHub blocks a merge.
            review:
              bannerState === 'changes-requested'
                ? 'changes-requested'
                : bannerState === 'blocked'
                  ? 'pending'
                  : 'approved',
            changesRequestedBy:
              bannerState === 'changes-requested' ? ['priyaraman'] : [],
            mergedAt: bannerState === 'merged' ? FAKE_TIME : null,
            closedAt: bannerState === 'closed' ? FAKE_TIME : null,
          }),
    },
  }
  const checks: GitHubChecksResponse = {
    state:
      bannerState === 'none' || bannerState === 'no-commits'
        ? 'waiting-for-pull-request'
        : 'available',
    checks: checksByState[bannerState].map((check, index): GitHubCheck => ({
      id: `check-${index}`,
      name: check.name,
      state: check.state,
      url: 'https://github.com/acme/storefront/actions',
      startedAt: FAKE_TIME - 72_000,
      completedAt: check.state === 'running' ? null : FAKE_TIME,
      durationMs: check.state === 'running' ? null : 72_000,
    })),
  }
  const preview: PreviewResponse = {
    preview: {
      id: FAKE_IDS.preview,
      port: 3000,
      url: new URL(
        previewPath(FAKE_IDS.org, FAKE_IDS.workspace, FAKE_IDS.preview),
        FAKE_ORIGIN,
      ).href,
      expiresAt: FAKE_TIME + 86_400_000,
    },
  }
  const previews: PreviewsResponse = { previews: [preview.preview] }
  const desktop: DesktopResponse = {
    url: 'https://desktop.conductive.test/#fake-desktop-token',
    expiresAt: FAKE_TIME + 600_000,
  }
  const terminal: TerminalResponse = {
    state: 'ready',
    socketPath: terminalPaths.socket(FAKE_IDS.org, FAKE_IDS.workspace),
    protocol: 'tty',
  }
  return {
    files,
    content,
    changes,
    diff,
    banner,
    checks,
    preview,
    previews,
    desktop,
    terminal,
  }
}
