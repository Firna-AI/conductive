import type { ContractReply } from './contract-fixture.test-support'
import type { CommandStatus } from './provider'

type FailureKind = Extract<ContractReply, { kind: 'failure' }>['errorKind']
type FileValue = Extract<ContractReply, { kind: 'file' }>['value']

const failureStatus: Record<FailureKind, number> = {
  invalid_request: 400,
  unauthorized: 401,
  payment_required: 402,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
}

function commandStatus(value: CommandStatus): Response {
  const { state, timedOut, ...fields } = value
  return Response.json({
    ok: true,
    type: 'command.status',
    success: value.exitCode === null || value.exitCode === 0,
    ...fields,
    status: state,
    ...(timedOut === null ? {} : { timedOut }),
  })
}

function fileReply(value: FileValue, relative = false): Response {
  return Response.json({
    ok: true,
    type: 'file.read',
    success: true,
    path: relative ? value.path.replace(/^\/home\/user\//, '') : value.path,
    encoding: value.encoding === 'utf-8' ? 'utf8' : 'base64',
    size: value.sizeBytes,
    content: value.content,
  })
}

function fileInfo(path: string, size: number): Response {
  return Response.json({
    ok: true,
    type: 'file.info',
    name: path.slice(path.lastIndexOf('/') + 1),
    path,
    isDir: false,
    isSymlink: false,
    size,
    mode: '0644',
    modifiedAt: '2026-11-07T00:00:00Z',
  })
}

function invalidReply(
  target: Extract<ContractReply, { kind: 'invalid' }>['target'],
  secret: string,
): Response {
  switch (target) {
    case 'sandbox':
      return Response.json({
        ok: true,
        type: 'sandbox.info',
        sandbox: { id: 'bx_one', state: 'unknown-state' },
      })
    case 'started_command':
      return Response.json({
        ok: true,
        type: 'command.started',
        success: true,
        processId: secret,
      })
    case 'command_status':
      return commandStatus({
        processId: 5678,
        state: 'running',
        running: true,
        exitCode: null,
        timedOut: null,
        stdout: secret,
        stderr: '',
        stdoutOffset: 0,
        stderrOffset: 0,
        stdoutNextOffset: 10,
        stderrNextOffset: 0,
        more: false,
      })
  }
}

export function boatContractReplies(
  reply: Exclude<ContractReply, { kind: 'network_failure' }>,
  secret: string,
): Response[] {
  switch (reply.kind) {
    case 'sandbox':
      return [
        Response.json({ ok: true, type: 'sandbox.info', sandbox: reply.value }),
      ]
    case 'snapshot':
      return [
        Response.json({
          ok: true,
          type: 'snapshot.saved.info',
          snapshot: reply.value,
        }),
      ]
    case 'command':
      return [
        Response.json({ ok: true, type: 'command.finished', ...reply.value }),
      ]
    case 'started_command':
      return [
        Response.json({
          ok: true,
          type: 'command.started',
          success: true,
          ...reply.value,
          pid: 1234,
          command: 'npm run build',
          startedAt: '2026-11-06T00:00:00Z',
        }),
      ]
    case 'command_status':
      return [commandStatus(reply.value)]
    case 'file':
      return [fileReply(reply.value, true)]
    case 'large_file':
      return [
        new Response(`private ${secret} credential`, { status: 413 }),
        fileInfo(reply.path, reply.sizeBytes),
      ]
    case 'wrong_file':
      return [
        fileReply({
          path: '/home/user/other.txt',
          sizeBytes: 2,
          encoding: 'base64',
          content: 'aGk=',
        }),
        fileInfo(reply.path, 2),
      ]
    case 'port':
      return [
        Response.json({
          ok: true,
          type: 'port.hosted',
          port: 3000,
          access: 'private',
          isProtected: true,
          url: 'https://sandbox-3000.on.boat.dev/?_token=server-port-token',
        }),
      ]
    case 'failure': {
      const retry =
        reply.retryAfterSeconds === undefined ? 3 : reply.retryAfterSeconds
      return [
        Response.json(
          {
            ok: false,
            code: reply.providerCode ?? 'provider_code',
            message: `Refused ${secret}`,
          },
          {
            status: failureStatus[reply.errorKind],
            headers: retry === null ? {} : { 'Retry-After': String(retry) },
          },
        ),
      ]
    }
    case 'invalid':
      return [invalidReply(reply.target, secret)]
  }
}
