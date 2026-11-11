import { shortCommit } from './commits.ts'
import { environmentValue, GitHub } from './github.ts'
import { previewNames } from './names.ts'
import type { ExternalIO } from './operations.ts'

export type PreviewState = 'deploying' | 'live' | 'failed' | 'deleted'
export interface CommentInputs {
  number: number
  sha: string
  state: PreviewState
  dataReset: boolean
}

export async function commentPreview(
  inputs: CommentInputs,
  environment: Readonly<Record<string, string | undefined>>,
  io: ExternalIO,
): Promise<'created' | 'updated'> {
  const names = previewNames(
    inputs.number,
    environmentValue(environment, 'PREVIEW_ZONE'),
  )
  const github = new GitHub(environment, io)
  const server = new URL(environmentValue(environment, 'GITHUB_SERVER_URL'))
    .origin
  const run = encodeURIComponent(environmentValue(environment, 'GITHUB_RUN_ID'))
  const base = `${server}/${github.repository}`
  const marker = '<!-- conductive-pr-preview -->'
  const body = [
    marker,
    `**Preview: ${inputs.state}**`,
    `[App](${names.appOrigin}) · [Marketing](${names.marketingOrigin})`,
    `Commit [\`${shortCommit(inputs.sha)}\`](${base}/commit/${inputs.sha})`,
    `[Workflow run](${base}/actions/runs/${run})`,
    ...(inputs.dataReset ? ['Preview data was reset.'] : []),
  ].join('\n')
  for (const comment of await github.comments(inputs.number)) {
    if (typeof comment.body !== 'string' || !comment.body.includes(marker))
      continue
    const user = comment.user
    if (
      typeof user !== 'object' ||
      user === null ||
      !('type' in user) ||
      user.type !== 'Bot'
    )
      continue
    if (
      typeof comment.id !== 'number' ||
      !Number.isSafeInteger(comment.id) ||
      comment.id < 1
    )
      throw new Error('GitHub returned an invalid comment ID.')
    await github.updateComment(comment.id, body)
    return 'updated'
  }
  await github.createComment(inputs.number, body)
  return 'created'
}
