import type { RunnerFileResponse } from '../../src/shared/runner-files'
import {
  filterDiffResponse,
  filterFileResponse,
} from '../../src/shared/output-fields'

export function filterRunnerFileResponse(
  response: RunnerFileResponse,
  text: (value: string) => string,
): RunnerFileResponse {
  if (!response.result.ok) return response
  return response.type === 'file.read.result'
    ? {
        ...response,
        result: {
          ok: true,
          file: filterFileResponse(response.result.file, text),
        },
      }
    : {
        ...response,
        result: {
          ok: true,
          diff: filterDiffResponse(response.result.diff, text),
        },
      }
}
