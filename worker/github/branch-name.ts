import { HttpError } from '../http'

export function requireGitBranchName(name: string): void {
  if (
    !name ||
    name === 'HEAD' ||
    name.startsWith('-') ||
    name.endsWith('.') ||
    name.includes('..') ||
    name.includes('@{') ||
    [...name].some(
      (character) =>
        character.charCodeAt(0) <= 32 ||
        character.charCodeAt(0) === 127 ||
        '~^:?*[\\'.includes(character),
    ) ||
    name
      .split('/')
      .some((part) => !part || part.startsWith('.') || part.endsWith('.lock'))
  )
    throw new HttpError(400, 'invalid_input', 'Use a valid Git branch name.')
}
