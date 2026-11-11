import { runPreviewCommand } from './cli.ts'

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
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Preview configuration failed.',
  )
  process.exitCode = 1
}
