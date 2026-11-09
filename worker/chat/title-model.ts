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
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const input: AiTextGenerationInput = {
      messages: [
        { role: 'system', content: TITLE_SYSTEM_PROMPT },
        { role: 'user', content: titlePrompt(text.slice(0, 4000)) },
      ],
      max_tokens: 32,
      stream: false,
    }
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error('The title request timed out.'))
      }, 15000)
    })
    const result = await Promise.race([
      run(model, input, { signal: controller.signal }),
      deadline,
    ])
    const answer =
      typeof result === 'object' && result !== null && 'response' in result
        ? result.response
        : undefined
    const title = typeof answer === 'string' ? cleanTitle(answer) : ''
    if (!title) throw new Error('The title answer is empty.')
    return title
  } catch (error) {
    warnWorker({
      kind: 'workspace_title_request_failed',
      error: errorSummary(error),
    })
    return null
  } finally {
    clearTimeout(timer)
  }
}
