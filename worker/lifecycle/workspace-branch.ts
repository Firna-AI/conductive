import { hash } from '../security/crypto'

const CITIES = [
  'lisbon',
  'oslo',
  'kyoto',
  'perth',
  'lima',
  'riga',
  'bern',
  'seoul',
  'milan',
  'porto',
  'quito',
  'delft',
] as const

export async function workspaceBranch(
  login: string,
  randomToken: () => string,
) {
  const random = await hash(randomToken())
  const city = CITIES[random.charCodeAt(0) % CITIES.length]
  const suffix = [...random.slice(1, 5)]
    .map(
      (character) =>
        'abcdefghijklmnopqrstuvwxyz0123456789'[character.charCodeAt(0) % 36],
    )
    .join('')
  return { city, branch: `${login}/${city}-${suffix}` }
}
