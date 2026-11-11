import { runPreviewCommand } from './cli.ts'
import { DeploymentFailure, deploymentLines } from './deployment-output.ts'

try {
  const result = await runPreviewCommand(process.argv.slice(2))
  switch (result.kind) {
    case 'written':
      console.log(result.path)
      break
    case 'skip':
      console.warn(result.warning)
      break
    case 'help':
      console.log(result.text)
      break
    case 'complete':
      for (const line of result.lines) console.log(line)
      break
  }
} catch (error) {
  if (error instanceof DeploymentFailure)
    for (const line of deploymentLines(error.output)) console.log(line)
  console.error(
    error instanceof Error ? error.message : 'Preview configuration failed.',
  )
  process.exitCode = 1
}
