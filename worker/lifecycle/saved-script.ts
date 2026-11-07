import { shellQuote, writeFileCommand } from './commands'

/** Stages saved text, preserves the caller's setup, and runs Bash explicitly. */
export function savedScriptCommand(
  path: string,
  script: string,
  beforeRun: readonly string[] = [],
): string {
  return [
    writeFileCommand(path, script),
    ...beforeRun,
    `bash ${shellQuote(path)}`,
  ].join('\n')
}
