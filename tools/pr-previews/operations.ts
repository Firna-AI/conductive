import type { PreviewSettings } from './settings.ts'

export interface CommandRequest {
  executable: string
  args: string[]
  cwd: string
  env: Record<string, string>
}

export interface CommandReply {
  exitCode: number
  stdout: string
  stderr: string
}

export interface ExternalIO {
  command(request: CommandRequest): Promise<CommandReply>
  fetch(request: Request): Promise<Response>
  now(): number
  pause(milliseconds: number): Promise<void>
  warn(message: string): void
}

export interface OperationContext {
  settings: PreviewSettings
  io: ExternalIO
  wrangler: string
  cwd: string
  environment: Readonly<Record<string, string | undefined>>
}
