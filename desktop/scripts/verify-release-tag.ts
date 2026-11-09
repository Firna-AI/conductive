import { runReleaseCommand } from './release-command.ts'
import { verifyReleaseTag } from './release-tag.ts'

const tag = process.env.RELEASE_TAG
const commit = process.env.RELEASE_COMMIT
if (!tag || !commit)
  throw new Error(
    'Set RELEASE_TAG and RELEASE_COMMIT to verify the release tag',
  )

const controller = new AbortController()
const cancel = () => controller.abort()
process.once('SIGINT', cancel)
process.once('SIGTERM', cancel)
try {
  await verifyReleaseTag({ tag, commit }, (program, args) =>
    runReleaseCommand(program, args, process.env, controller.signal),
  )
  process.stdout.write(`Release tag ${tag} matches commit ${commit}\n`)
} finally {
  process.removeListener('SIGINT', cancel)
  process.removeListener('SIGTERM', cancel)
}
