import type { ExplainSessionRequest } from '../../src/shared/sessions'

const lineBreak = /\r\n|\n|\r/g

function quoteLines(text: string): string {
  return text
    .split(lineBreak)
    .map((line) => `> ${line}`)
    .join('\n')
}

export function explanationPrompt(
  input: ExplainSessionRequest,
  parentLink: string,
): string {
  const { question, quote } = input
  const heading =
    question?.replace(lineBreak, '\n') ??
    `Explain "${quote.split(lineBreak)[0]}"`
  return [
    heading,
    '',
    `Session: ${parentLink}`,
    `Message: ${input.messageId}`,
    ...(question === undefined
      ? []
      : ['The selected text:', quoteLines(quote)]),
    'The text with the lines around it:',
    quoteLines([input.before, quote, input.after].join('\n')),
    '',
    'Read that session with `read_session` if you need more context. Change no files. Keep the answer short, because it shows in a small popover.',
  ].join('\n')
}
