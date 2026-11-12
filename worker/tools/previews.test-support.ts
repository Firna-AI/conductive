import { PREVIEW_RELAY_PORT } from '../../src/shared/previews'
import { OTHER_WORKSPACE } from '../chat/integration/outer-seed.test-support'
import { record, number } from '../chat/inputs'
import { agentWriteFixture } from '../features/agent-session-writes.test-support'

export async function previewToolFixture(bundle: string) {
  const hosted: number[] = []
  const active = await agentWriteFixture(bundle, {
    configuration: { PREVIEW_DOMAIN: 'preview.test' },
    outbound: async (request, fallback) => {
      const url = new URL(request.url)
      if (url.pathname.endsWith('/host')) {
        const body = record(await request.clone().json())
        hosted.push(number(body.port))
        return Response.json({
          ok: true,
          type: 'port.hosted',
          port: PREVIEW_RELAY_PORT,
          url: `https://preview-relay-${PREVIEW_RELAY_PORT}.on.boat.dev?_token=preview-port-token`,
          access: 'private',
          isProtected: true,
        })
      }
      if (
        url.pathname.endsWith('/commands') &&
        record(await request.clone().json()).command ===
          'systemctl is-active --quiet conductive-preview-relay.socket'
      ) {
        return Response.json({
          ok: true,
          type: 'command.finished',
          exitCode: 0,
          stdout: '',
          stderr: '',
          timedOut: false,
        })
      }
      return fallback(request)
    },
  })
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_preview_tools' WHERE id = ?",
  )
    .bind(OTHER_WORKSPACE)
    .run()
  return {
    ...active,
    get runtime() {
      return active.runtime
    },
    hosted,
  }
}

export type PreviewToolFixture = Awaited<ReturnType<typeof previewToolFixture>>

export async function seedForeignPreviewWorkspace(active: PreviewToolFixture) {
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES ('foreign-preview-section', 'other-org', 'General', 0, 1, 1)",
    ),
    active.env.DB.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('foreign-preview-repo', 'other-org', 999, 'private/preview', 'main')",
    ),
    active.env.DB.prepare(
      "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at) VALUES ('foreign-preview-workspace', 'other-org', 'foreign-preview-repo', 'outsider', 'foreign-preview-section', 'Private', 'private/preview', 'ready', 1, 1)",
    ),
  ])
}
