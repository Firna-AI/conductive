import { expect, it } from 'vitest'
import { randomToken } from '../security/crypto'
import { SAVED_IMAGE_NAME, savedImageName } from './image-names'

it('gives a random build ID a name that the provider accepts', () => {
  for (let index = 0; index < 50; index++) {
    const name = savedImageName(randomToken())
    expect(name).toMatch(SAVED_IMAGE_NAME)
  }
})

it('gives the same build ID the same name, and IDs that differ in case different names', () => {
  const id = 'ImkYZJLkE6hZ9ea7ZAadR07NDcxeEE6KBZJkmO6OnUA'
  const otherCase = `i${id.slice(1)}`
  expect(savedImageName(id)).toBe(savedImageName(id))
  expect(savedImageName(otherCase)).toMatch(SAVED_IMAGE_NAME)
  expect(savedImageName(id)).not.toBe(savedImageName(otherCase))
})

it('names a short ID that is not base64url from its text', () => {
  expect(savedImageName('build 1')).toMatch(SAVED_IMAGE_NAME)
})

it('refuses an ID that is too long for a provider name', () => {
  expect(() => savedImageName('x'.repeat(200))).toThrow(
    'The build ID is too long for a saved image name',
  )
})
