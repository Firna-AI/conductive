import { expect, it } from 'vitest'

import { routes as appRoutes } from '../../src/app/router'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { FEEDBACK_PATH } from '../../src/shared/feedback'
import { githubPaths } from '../../src/shared/github'
import { GITHUB_INSTALL_PATH } from '../../src/shared/github-setup'
import { operatorWaitlistSwitchPath } from '../../src/shared/operator-waitlist'
import { routinePaths } from '../../src/shared/routines'
import { sessionTranscriptPath } from '../../src/shared/sessions'
import { joinPath } from '../../src/shared/waitlist'
import { workspacePaths } from '../../src/shared/workspaces'
import { PREVIEW_HANDOFF_PATH } from '../security/preview-launch-path'
import { workerRouteTemplate } from './routes'

it('keeps code-owned route segments and replaces all parameters', () => {
  expect(
    workerRouteTemplate(
      '/api/orgs/private-org/workspaces/private-workspace/sessions/private-session/messages',
    ),
  ).toBe('/api/orgs/:param/workspaces/:param/sessions/:param/messages')
  expect(workerRouteTemplate('/v1/internal/image-source/credential')).toBe(
    '/v1/internal/image-source/credential',
  )
  expect(workerRouteTemplate('/api/operator/users/123/suspension')).toBe(
    '/api/operator/users/:param/suspension',
  )
  expect(workerRouteTemplate('/private/path?token=private')).toBe(
    '/:param/:param',
  )
  expect(workerRouteTemplate('/private/undefined')).toBe('/:param/:param')
  const supportedRoutes = [
    [FEEDBACK_PATH, '/api/feedback'],
    [
      githubPaths.mergeResult(
        'private-org',
        'private-workspace',
        'private-job',
      ),
      '/api/orgs/:param/workspaces/:param/github/merge/:param',
    ],
    [
      workspacePaths.continueResult(
        'private-org',
        'private-workspace',
        'private-job',
      ),
      '/api/orgs/:param/workspaces/:param/continue/:param',
    ],
    [operatorWaitlistSwitchPath(), '/api/operator/waitlist-switch'],
    [
      routinePaths.runNow('private-org', 'private-routine'),
      '/api/orgs/:param/routines/:param/run-now',
    ],
    [
      routinePaths.runs('private-org', 'private-routine'),
      '/api/orgs/:param/routines/:param/runs',
    ],
    [
      sessionTranscriptPath(
        'private-org',
        'private-workspace',
        'private-session',
        'full',
      ),
      '/api/orgs/:param/workspaces/:param/sessions/:param/transcript',
    ],
    [GITHUB_INSTALL_PATH, '/github/install'],
    [joinPath('private-code'), '/join/:param'],
    [`${MACHINE_PATHS.codexGateway}/responses`, '/v1/model/codex/responses'],
    [
      `${MACHINE_PATHS.claudeGateway}/v1/messages`,
      '/v1/model/claude/v1/messages',
    ],
    [
      `${MACHINE_PATHS.claudeGateway}/v1/messages/count_tokens`,
      '/v1/model/claude/v1/messages/count_tokens',
    ],
    [PREVIEW_HANDOFF_PATH, '/.conductive/authorize'],
    [appRoutes.accountTab('preferences'), '/account/preferences'],
    [appRoutes.newWorkspace('private-org'), '/orgs/:param/new'],
    [
      appRoutes.settings('private-org', 'cloud-computer'),
      '/orgs/:param/settings/cloud-computer',
    ],
    [appRoutes.operatorCodes(), '/operator/codes'],
  ] as const
  for (const [path, expected] of supportedRoutes)
    expect(workerRouteTemplate(path), path).toBe(expected)
})
