import type { RunnerToolDetailPart } from '../../src/shared/generated/RunnerToolDetailPart'

export function part(
  context: { sessionId: string; turnId: string },
  detail: string,
  partNumber: number,
  finalPart = false,
): RunnerToolDetailPart {
  return {
    type: 'tool.detail.part',
    ...(partNumber === 1
      ? {
          start: {
            ...context,
            tool: {
              id: 'tool',
              kind: 'run',
              target: 'secretpass',
              detail: null,
              omittedDetailBytes: 17,
              state: 'done',
            },
          },
        }
      : {}),
    detail,
    partNumber,
    finalPart,
  }
}
