import { expect, it } from 'vitest'

import { BRIDGE_MESSAGE_START } from '../../../src/shared/terminal-bridge'
import { InputSplitter, type InputPart } from './input'

const bytes = (text: string) => new TextEncoder().encode(text)
const parts = (list: InputPart[]) =>
  list.map((part) =>
    part.kind === 'keys'
      ? ['keys', new TextDecoder().decode(part.bytes)]
      : ['message', part.text],
  )

it('takes messages out of the keys, also when they span chunks', () => {
  const splitter = new InputSplitter()
  expect(
    parts(splitter.split(bytes(`ab${BRIDGE_MESSAGE_START}one\x07cd\x1b]77`))),
  ).toEqual([
    ['keys', 'ab'],
    ['message', 'one'],
    ['keys', 'cd'],
  ])
  expect(splitter.holding).toBe(true)
  expect(parts(splitter.split(bytes('17;two')))).toEqual([])
  expect(parts(splitter.split(bytes('\x07e')))).toEqual([
    ['message', 'two'],
    ['keys', 'e'],
  ])
})

it('gives a held Escape key back as a key', () => {
  const splitter = new InputSplitter()
  expect(parts(splitter.split(bytes('\x1b')))).toEqual([])
  expect(new TextDecoder().decode(splitter.flush())).toBe('\x1b')
  expect(splitter.holding).toBe(false)
})

it('makes an unfinished message keys again at an escape byte', () => {
  const splitter = new InputSplitter()
  expect(
    parts(splitter.split(bytes(`${BRIDGE_MESSAGE_START}ab\x1b[A`))),
  ).toEqual([
    ['keys', `${BRIDGE_MESSAGE_START}ab`],
    ['keys', '\x1b[A'],
  ])
})

it('drops a message that is longer than any paste', () => {
  const splitter = new InputSplitter()
  splitter.split(bytes(BRIDGE_MESSAGE_START))
  splitter.split(new Uint8Array(6 * 1_024 * 1_024).fill(0x61))
  expect(parts(splitter.split(bytes('\x07x')))).toEqual([['keys', 'x']])
})
