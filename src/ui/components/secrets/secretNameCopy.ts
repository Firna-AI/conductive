import { secretsWords } from './secretsCopy'

/**
 * The words of the rule of new secret names. Add secret and Save as secret
 * take a name of letters, digits, and underscores only. A name that an org
 * already has keeps working, and nothing asks to change it. The app and the
 * mockups take them from here.
 */

/** The characters that a new name can use. */
const nameRule = 'Use only letters, digits, and underscores.'

/** The hint of the name in Add secret: what it is for, and its characters. */
export const addNameHint = `${secretsWords.nameHint} ${nameRule}`

/** The error of a name that Add secret refused. It shows in place of the hint. */
export const refusedNameError = nameRule

/**
 * The line under the choices of how long the values last, when a name of
 * the request that the org does not have cannot become a secret. The other
 * choices stay. One choice covers every value, so one such name turns Save
 * as secret off for the whole answer. `count` is the number of names that
 * ask for a value.
 */
export function saveNeedsName(count: number): string {
  return count === 1
    ? 'Save as secret needs a name with only letters, digits, and underscores.'
    : 'Save as secret needs each name to use only letters, digits, and underscores.'
}
