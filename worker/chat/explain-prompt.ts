import type { ExplainSessionRequest } from '../../src/shared/sessions'

export function explanationPrompt(
  input: ExplainSessionRequest,
  parentLink: string,
): string {
  const firstLine = input.quote.split(/\r\n|\n|\r/)[0]
  const context = [input.before, input.quote, input.after]
    .join('\n')
    .split(/\r\n|\n|\r/)
    .map((line) => `> ${line}`)
    .join('\n')
  return [
    `Explain "${firstLine}"`,
    '',
    `Session: ${parentLink}`,
    `Message: ${input.messageId}`,
    'The text with the lines around it:',
    context,
    '',
    'Read that session with `read_session` if you need more context. Change no files. Keep the answer short, because it shows in a small popover.',
  ].join('\n')
}
