#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const mode = process.argv[2]
if (mode !== 'get' && mode !== 'token') process.exit(0)
if (mode === 'get') {
  const fields = new Map(
    readFileSync(0, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const split = line.indexOf('=')
        return [line.slice(0, split), line.slice(split + 1)]
      }),
  )
  if (fields.get('protocol') !== 'https' || fields.get('host') !== 'github.com')
    process.exit(0)
}

const FAILED = 'GitHub access failed. Try again.'

/** Its message is safe to show to the person or the agent that ran Git. */
class ShownError extends Error {}

/** The Worker's error message is product text. Show it when it is one plain line. */
async function refusal(response) {
  try {
    const message = (await response.json())?.error?.message
    if (
      typeof message === 'string' &&
      /^[^\p{Cc}\p{Cf}]{1,300}$/u.test(message)
    )
      return message
  } catch {
    // A body that is not the Worker's error shape gets the fixed message.
  }
  return FAILED
}

const { CONDUCTIVE_MACHINE_ORIGIN, CONDUCTIVE_TURN_ID, WORKSPACE_TOKEN } =
  process.env
try {
  if (!CONDUCTIVE_MACHINE_ORIGIN || !WORKSPACE_TOKEN)
    throw new Error('Missing credential context')
  if (mode === 'get' && !CONDUCTIVE_TURN_ID)
    throw new ShownError(
      'Git gets GitHub access in an agent turn. Ask an agent to run this command.',
    )
  const origin = new URL(CONDUCTIVE_MACHINE_ORIGIN)
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('Invalid machine origin')
  const response = await fetch(new URL('/v1/git/credential', origin), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${WORKSPACE_TOKEN}`,
      ...(CONDUCTIVE_TURN_ID
        ? { 'X-Conductive-Turn-Id': CONDUCTIVE_TURN_ID }
        : {}),
    },
  })
  if (!response.ok) throw new ShownError(await refusal(response))
  const value = await response.json()
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof value.token !== 'string' ||
    !value.token ||
    /[\r\n]/.test(value.token)
  )
    throw new Error('Invalid credential')
  process.stdout.write(
    mode === 'token'
      ? `${value.token}\n`
      : `username=x-access-token\npassword=${value.token}\n\n`,
  )
} catch (error) {
  process.stderr.write(
    `${error instanceof ShownError ? error.message : FAILED}\n`,
  )
  process.exitCode = 1
}
