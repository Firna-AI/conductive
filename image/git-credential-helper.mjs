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
const {
  CONDUCTIVE_MACHINE_ORIGIN,
  CONDUCTIVE_TURN_ID,
  CONDUCTIVE_ACTIVATION_ID,
  WORKSPACE_TOKEN,
} = process.env
try {
  if (
    !CONDUCTIVE_MACHINE_ORIGIN ||
    !WORKSPACE_TOKEN ||
    (mode === 'get' && !CONDUCTIVE_TURN_ID && !CONDUCTIVE_ACTIVATION_ID)
  )
    throw new Error('Missing credential context')
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
      ...(CONDUCTIVE_ACTIVATION_ID
        ? { 'X-Conductive-Activation-Id': CONDUCTIVE_ACTIVATION_ID }
        : {}),
    },
  })
  if (!response.ok) throw new Error('Credential request failed')
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
} catch {
  process.stderr.write(
    'GitHub access failed. Check the current turn and sign in again.\n',
  )
  process.exitCode = 1
}
