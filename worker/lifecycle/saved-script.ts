import { shellQuote, writeFileCommand } from './commands'

const scriptText = Symbol('saved-script-text')

export interface SavedScript {
  readonly [scriptText]: string
}

export function readSavedScript(text: string): SavedScript {
  return { [scriptText]: text }
}

/** Only storage and transport boundaries serialize saved script text. */
export function serializeSavedScript(script: SavedScript): string {
  return script[scriptText]
}

/** Stages saved text, preserves the caller's setup, and runs Bash explicitly. */
export function savedScriptCommand(
  path: string,
  script: SavedScript,
  beforeRun: readonly string[] = [],
): string {
  return [
    writeFileCommand(path, script[scriptText]),
    ...beforeRun,
    `bash ${shellQuote(path)}`,
  ].join('\n')
}
