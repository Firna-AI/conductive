import { startProcess, type StartProcess } from './process'
import { object, string } from '../parse'
import { TITLE_SYSTEM_PROMPT, titlePrompt } from '../title-text'
import { startCodexServer } from './codex-server'
import type { TitleRequest } from './title'

export function createCodexTitle(
  start: StartProcess = startProcess,
): TitleRequest {
  return async (options) => {
    let resolve: (answer: string) => void = () => {}
    let reject: (error: Error) => void = () => {}
    const completed = new Promise<string>((yes, no) => {
      resolve = yes
      reject = no
    })
    void completed.catch(() => {})
    let answer = ''
    const server = await startCodexServer(
      { ...options, cwd: options.home },
      {
        'features.shell_tool': false,
        'features.multi_agent': false,
        'features.multi_agent_v2': false,
        'features.code_mode': false,
        'features.apps': false,
        'features.plugins': false,
        'features.hooks': false,
        'features.memories': false,
        project_doc_max_bytes: 0,
        web_search: 'disabled',
        mcp_servers: {},
      },
      (method, params) => {
        const value = object(params)
        if (method === 'item/completed') {
          const item = object(value.item)
          if (item.type === 'agentMessage') answer = string(item.text)
        }
        if (method === 'turn/completed') {
          if (object(value.turn).status === 'completed') resolve(answer)
          else reject(new Error('The title turn failed.'))
        }
        if (method === 'error' && value.willRetry !== true)
          reject(new Error('The title request failed.'))
      },
      () => reject(new Error('The title agent exited.')),
      start,
    )
    const abort = () => reject(new Error('The title request stopped.'))
    options.signal.addEventListener('abort', abort, { once: true })
    try {
      options.signal.throwIfAborted()
      const response = object(
        await server.rpc.request('thread/start', {
          ephemeral: true,
          model: options.choice.model,
          modelProvider: 'conductive',
          cwd: options.home,
          sandbox: 'read-only',
          approvalPolicy: 'never',
          baseInstructions: TITLE_SYSTEM_PROMPT,
          developerInstructions: '',
        }),
      )
      await server.rpc.request('turn/start', {
        threadId: string(object(response.thread).id),
        model: options.choice.model,
        effort: options.choice.effort,
        input: [
          { type: 'text', text: titlePrompt(options.text), text_elements: [] },
        ],
      })
      return await completed
    } finally {
      options.signal.removeEventListener('abort', abort)
      await server.close()
    }
  }
}
