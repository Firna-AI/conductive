#!/usr/bin/env node
import { readFileSync } from 'node:fs'

if (process.argv[2] !== 'get') process.exit(0)
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
const { CONDUCTING_MACHINE_ORIGIN, CONDUCTING_TURN_ID, WORKSPACE_TOKEN } =
  process.env
try {
  if (!CONDUCTING_MACHINE_ORIGIN || !CONDUCTING_TURN_ID || !WORKSPACE_TOKEN)
    throw new Error('Missing current turn')
  const origin = new URL(CONDUCTING_MACHINE_ORIGIN)
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('Invalid machine origin')
  const response = await fetch(new URL('/git/credential', origin), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${WORKSPACE_TOKEN}`,
      'X-Conducting-Turn-Id': CONDUCTING_TURN_ID,
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
  process.stdout.write(`username=x-access-token\npassword=${value.token}\n\n`)
} catch {
  process.stderr.write(
    'GitHub access failed. Check the current turn and sign in again.\n',
  )
  process.exitCode = 1
}
