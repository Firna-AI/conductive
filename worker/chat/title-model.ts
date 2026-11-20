import type { AppEnv } from '../env'
import { warnWorker } from '../warnings'
import { errorSummary } from '../warning-values'
import { cleanTitle, TITLE_SYSTEM_PROMPT, titlePrompt } from './title-text'

export type TitleModelCall = (
  model: string,
  input: AiTextGenerationInput,
  options: { signal: AbortSignal },
) => Promise<unknown>

export function titleModelBinding(env: AppEnv): TitleModelCall | undefined {
  const ai = env.AI
  return ai
    ? (model, input, options) => ai.run(model, input, options)
    : undefined
}

/** Workers AI answers some title requests late, so each request tries again. */
const TITLE_ATTEMPTS = 3
const TITLE_ATTEMPT_TIMEOUT_MS = 45_000

export async function requestWorkspaceTitle(
  model: string | undefined,
  run: TitleModelCall | undefined,
  text: string,
): Promise<string | null> {
  if (!text.trim()) return null
  if (!model?.trim() || !run) {
    warnWorker({ kind: 'workspace_title_unconfigured' })
    return null
  }
  const input: AiTextGenerationInput = {
    messages: [
      { role: 'system', content: TITLE_SYSTEM_PROMPT },
      { role: 'user', content: titlePrompt(text.slice(0, 4000)) },
    ],
    max_tokens: 32,
    stream: false,
  }
  let failure: unknown
  for (let attempt = 0; attempt < TITLE_ATTEMPTS; attempt += 1) {
    try {
      return await requestTitleOnce(model, run, input)
    } catch (error) {
      failure = error
    }
  }
  warnWorker({
    kind: 'workspace_title_request_failed',
    error: errorSummary(failure),
  })
  return null
}

/** One model call that gives a clean title, or throws. */
async function requestTitleOnce(
  model: string,
  run: TitleModelCall,
  input: AiTextGenerationInput,
): Promise<string> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error('The title request timed out.'))
      }, TITLE_ATTEMPT_TIMEOUT_MS)
    })
    const result = await Promise.race([
      run(model, input, { signal: controller.signal }),
      deadline,
    ])
    const answer = readTitleAnswer(result)
    const title = typeof answer === 'string' ? cleanTitle(answer) : ''
    if (!title) throw new Error('The title answer is empty.')
    return title
  } finally {
    clearTimeout(timer)
  }
}

function readTitleAnswer(result: unknown): string | undefined {
  if (typeof result !== 'object' || result === null) return undefined
  if ('response' in result && typeof result.response === 'string') {
    return result.response
  }
  if (!('choices' in result) || !Array.isArray(result.choices)) return undefined
  const choice: unknown = result.choices[0]
  if (typeof choice !== 'object' || choice === null || !('message' in choice)) {
    return undefined
  }
  const message = choice.message
  return typeof message === 'object' &&
    message !== null &&
    'content' in message &&
    typeof message.content === 'string'
    ? message.content
    : undefined
}
