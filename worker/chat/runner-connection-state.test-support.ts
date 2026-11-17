import { record, string } from './inputs'
import { runnerState } from './runner-native.test-support'

export function savedRunnerState(state: unknown) {
  const values = runnerState(state)
  const index = record(values.get('native:runner:current'))
  const chunks = Array.from({ length: Number(index.parts) }, (_, part) =>
    string(values.get(`native:runner:state:${part}`)),
  )
  return record(JSON.parse(chunks.join('')))
}

export function seedRunnerState(state: unknown) {
  return {
    values: {
      'native:runner:current': { parts: 1 },
      'native:runner:state:0': JSON.stringify(state),
    },
  }
}
