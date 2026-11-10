import noticeStyles from '../../../docs/mockups/src/components/common/Notice.module.css'
import type { BuildsResponse, ImageBuild } from '../../shared/org-settings'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { textOf } from '../test-render'

// The builds of Acme for the tests of the screens that show them, and the
// notices of those screens.

/**
 * A build of Acme that started `ago` ms before the clock of the test. A
 * refresh only fetches commits.
 */
export function buildOf(
  id: string,
  state: ImageBuild['state'],
  ago: number,
  kind: ImageBuild['kind'] = 'build',
): ImageBuild {
  const ended = state !== 'running'
  return {
    id,
    orgId: FAKE_IDS.org,
    kind,
    state,
    startedAt: FAKE_TIME - ago,
    completedAt: ended ? FAKE_TIME - ago + 60_000 : null,
    durationMs: ended ? 60_000 : null,
    error: state === 'failed' ? 'The install script failed.' : null,
  }
}

/** The good build of the org image of Acme, which ended 59 minutes ago. */
export const goodBuild = buildOf('good', 'succeeded', 3_600_000)

/** A repository of Acme as the changes of the builds name it. */
export function changed(id: string): { id: string; fullName: string } {
  return { id, fullName: `acme/${id}` }
}

/**
 * The builds of Acme, whose org image is `goodBuild`: `newer` are the
 * builds after it, newest first, and `changes` the saved changes that the
 * image does not hold.
 */
export function imageBuilds(
  newer: readonly ImageBuild[],
  changes: Partial<BuildsResponse['changes']> = {},
): BuildsResponse {
  return {
    builds: [...newer, goodBuild],
    currentImageBuildId: goodBuild.id,
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
      ...changes,
    },
  }
}

/**
 * Each notice in `root`, in its order: its text, whether it has the danger
 * tone and the spinner, and its buttons, with "(off)" after a button that
 * is off.
 */
export function noticesOf(root: ParentNode) {
  return Array.from(
    root.querySelectorAll(`.${noticeStyles.notice}`),
    (notice) => ({
      text: textOf(notice.outerHTML),
      danger: notice.classList.contains(noticeStyles.danger),
      spinner: notice.querySelector(`.${noticeStyles.busy}`) !== null,
      buttons: Array.from(
        notice.querySelectorAll('button'),
        (button) =>
          `${textOf(button.outerHTML)}${button.hasAttribute('disabled') ? ' (off)' : ''}`,
      ),
    }),
  )
}
