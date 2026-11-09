import { runReleaseCommand } from './release-command.ts'

interface SignatureEvidence {
  verifyStatus: number | null
  displayStatus: number | null
  ticketStatus: number | null
  assessmentStatus: number | null
  signatureDisplay: string
  assessmentOutput: string
}

export function assertReleaseSignature(
  evidence: SignatureEvidence,
  teamId: string,
) {
  if (
    evidence.verifyStatus !== 0 ||
    evidence.displayStatus !== 0 ||
    evidence.ticketStatus !== 0 ||
    evidence.assessmentStatus !== 0 ||
    !/^Authority=Developer ID Application: .+$/m.test(
      evidence.signatureDisplay,
    ) ||
    !evidence.signatureDisplay
      .split('\n')
      .includes(`TeamIdentifier=${teamId}`) ||
    !/^CodeDirectory .*flags=0x[0-9a-f]+\([^)]*\bruntime\b/m.test(
      evidence.signatureDisplay,
    ) ||
    !/^Timestamp=.+$/m.test(evidence.signatureDisplay) ||
    !/^source=Notarized Developer ID$/m.test(evidence.assessmentOutput)
  ) {
    throw new Error(
      'The release app must have a valid, timestamped, hardened and notarized Developer ID signature from the expected Apple team',
    )
  }
}

export async function verifyReleaseApp(
  bundle: string,
  teamId: string,
  environment: NodeJS.ProcessEnv,
  signal: AbortSignal,
) {
  const check = async (program: string, args: string[]) => {
    const result = await runReleaseCommand(program, args, environment, signal)
    return {
      status: 0,
      output: result.stdout + result.stderr,
    }
  }
  const verification = await check('codesign', [
    '--verify',
    '--deep',
    '--strict',
    bundle,
  ])
  const display = await check('codesign', ['--display', '--verbose=4', bundle])
  const ticket = await check('xcrun', ['stapler', 'validate', bundle])
  const assessment = await check('spctl', [
    '--assess',
    '--type',
    'execute',
    '--verbose=2',
    bundle,
  ])
  const evidence = {
    bundle,
    verifyStatus: verification.status,
    displayStatus: display.status,
    ticketStatus: ticket.status,
    assessmentStatus: assessment.status,
    verifyOutput: verification.output,
    signatureDisplay: display.output,
    ticketOutput: ticket.output,
    assessmentOutput: assessment.output,
  }
  process.stdout.write(JSON.stringify(evidence, null, 2) + '\n')
  assertReleaseSignature(evidence, teamId)
  return evidence
}
