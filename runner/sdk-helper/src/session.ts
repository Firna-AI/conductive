import type { Agent } from './generated/Agent'
import type { HelperOutput } from './generated/HelperOutput'
import type { HelperRequest } from './generated/HelperRequest'
import { failureCause } from './providers/failure'
import { ProviderLifetime } from './providers/lifetime'
import type { ProviderFactory, ProviderProcess } from './providers/types'
import type { SkillInputs } from './providers/skill-input'
import { readSkillContent } from './skill-content'
import { readOrgSkill } from './skill-org'
import { SkillScanner } from './skills'

/** Owns one agent start, including cancellation while setup is pending. */
export class HelperSession {
  private readonly controller = new AbortController()
  private readonly lifetime = new ProviderLifetime()
  private provider: ProviderProcess | null = null
  private starting: Promise<ProviderProcess> | null = null
  private closing: Promise<void> | null = null
  private queue = Promise.resolve()
  private finished = false
  private scanner: SkillScanner | null = null
  private readonly skillInputs?: SkillInputs

  private readonly providers: Record<Agent, ProviderFactory>
  private readonly output: (output: HelperOutput) => void
  private readonly warm: () => Promise<unknown>
  private readonly ended: () => void

  constructor(
    providers: Record<Agent, ProviderFactory>,
    output: (output: HelperOutput) => void,
    warm: () => Promise<unknown>,
    ended: () => void,
    skillInputs?: SkillInputs,
  ) {
    this.skillInputs = skillInputs
    this.providers = providers
    this.output = (message) => {
      if (!this.finished) output(message)
    }
    this.warm = warm
    this.ended = ended
  }

  accept(request: HelperRequest): void {
    if (request.type === 'close') {
      void this.close().then(
        () => {
          this.output({
            type: 'response',
            requestId: request.requestId,
            result: null,
          })
          this.output({ type: 'exit' })
          this.finish()
        },
        () => this.fail(request.requestId),
      )
      return
    }
    this.queue = this.queue.then(async () => {
      try {
        if (this.closing) throw new Error('The agent process ended.')
        if (request.type === 'skills') {
          this.scanner ??= new SkillScanner({
            repository: request.repository,
            home: request.home,
            now: Date.now,
            warn: (message) => this.output({ type: 'warning', message }),
          })
          const skills = await this.scanner.scan(
            request.reload,
            request.orgSkills ?? null,
          )
          this.output({ type: 'skills', requestId: request.requestId, skills })
          return
        }
        if (request.type === 'skill.read') {
          const { source, maxBytes } = request
          const result =
            source.type === 'file'
              ? await readSkillContent(source.path, maxBytes)
              : await readOrgSkill(source, maxBytes)
          this.output({
            type: 'skill.read.result',
            requestId: request.requestId,
            result,
          })
          return
        }
        const result = await this.run(request)
        this.output({ type: 'response', requestId: request.requestId, result })
        if (request.type === 'warm') {
          this.output({ type: 'exit' })
          this.finish()
        }
      } catch (error) {
        const failure = failureCause(error)
        this.output({
          type: 'error',
          requestId: request.requestId,
          code: failure.code,
          message: failure.message,
        })
      }
    })
  }

  close(): Promise<void> {
    this.closing ??= (async () => {
      this.controller.abort()
      await this.lifetime.close()
      const provider = await this.starting?.catch(() => null)
      await provider?.close()
      await this.lifetime.close()
    })()
    return this.closing
  }

  private async run(
    request: Exclude<
      HelperRequest,
      { type: 'close' | 'skills' | 'skill.read' }
    >,
  ) {
    if (request.type === 'warm') {
      await this.warm()
      return null
    }
    if (request.type === 'start') {
      if (this.starting) throw new Error('The agent already started.')
      this.starting = this.providers[request.options.choice.agent]({
        ...request.options,
        backgroundNoteIds: new Set(request.options.backgroundNoteIds),
        backgroundNotes: (ids) =>
          this.output({ type: 'background.notes', ids }),
        event: (event) => this.output({ type: 'event', event }),
        warn: (message) => this.output({ type: 'warning', message }),
        lifetime: this.lifetime,
        signal: this.controller.signal,
      })
      try {
        this.provider = await this.starting
      } catch (error) {
        await this.lifetime.close()
        throw error
      }
      return null
    }
    if (!this.provider) throw new Error('The agent is unavailable. Try again.')
    if (request.type === 'model') return this.provider.model(request.choice)
    if (request.type === 'send') {
      this.skillInputs?.replace(request.skills ?? [])
      await this.provider.send(request.input)
    } else await this.provider.interrupt()
    return null
  }

  private finish(): void {
    if (this.finished) return
    this.finished = true
    this.ended()
  }

  private fail(requestId: string): void {
    this.output({
      type: 'error',
      requestId,
      code: 'agent_failed',
      message: 'The agent could not close.',
    })
    this.finish()
  }
}
