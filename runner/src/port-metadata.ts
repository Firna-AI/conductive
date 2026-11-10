import { basename, isAbsolute, relative, resolve, sep } from 'node:path'

import {
  PORT_FOLDER_MAX_CHARACTERS,
  PORT_NAME_MAX_CHARACTERS,
} from '../../src/shared/ports'

const interpreters =
  /^(?:node(?:js)?|bun|deno|python(?:\d+(?:\.\d+)*)?|ruby|perl|php|bash|sh|zsh|dash)$/u
const safeFlags =
  /^--(?:no-warnings|enable-source-maps|watch|inspect(?:-brk)?|allow-[a-z-]+)$/u

export function portName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const words = value.split('\0')
  const executable = basename(words[0] ?? '')
  if (!executable) return null
  let index = 0
  if (interpreters.test(executable)) {
    index = 1
    if (
      (executable === 'deno' || executable === 'bun') &&
      words[index] === 'run'
    )
      index++
    while (words[index]?.startsWith('-')) {
      if (/^python/u.test(executable) && words[index] === '-m') {
        index++
        break
      }
      if (words[index] === '--') {
        index++
        break
      }
      const pythonFlag =
        /^python/u.test(executable) &&
        /^-(?:[uBEIsSqv]|OO?)$/u.test(words[index])
      const denoFlag = executable === 'deno' && words[index] === '-A'
      if (
        !pythonFlag &&
        !denoFlag &&
        !safeFlags.test(words[index]) &&
        !/^--[a-z-]+=/u.test(words[index])
      )
        return null
      index++
    }
  }
  const program = words[index]
  if (!program || program.startsWith('-')) return null
  const next = words[index + 1] ?? ''
  const name =
    basename(program) + (/^[a-z][a-z-]{0,19}$/u.test(next) ? ` ${next}` : '')
  return Array.from(name).slice(0, PORT_NAME_MAX_CHARACTERS).join('')
}

function below(root: string, path: string): string | null {
  const folder = relative(root, path)
  return isAbsolute(folder) || folder === '..' || folder.startsWith(`..${sep}`)
    ? null
    : folder
}

export function portFolder(
  value: unknown,
  home: string,
  cwd: string,
): string | null {
  if (typeof value !== 'string' || !isAbsolute(value)) return null
  const code = resolve(home, 'code')
  const inCode = below(code, value)
  if (!inCode) return null
  const inRepository = below(resolve(cwd), value)
  const folder = inRepository === null ? inCode : inRepository
  if (!folder) return null
  const characters = Array.from(folder)
  return characters.length > PORT_FOLDER_MAX_CHARACTERS
    ? `…${characters.slice(-(PORT_FOLDER_MAX_CHARACTERS - 1)).join('')}`
    : folder
}
