import { shellQuote } from './commands'

export function fetchBranchCommand(
  branch: string,
  missingExit: number,
): string {
  return `if git fetch origin ${shellQuote(`+refs/heads/${branch}:refs/remotes/origin/${branch}`)}; then
  :
else
  conductive_fetch_status=$?
  if git ls-remote --exit-code origin ${shellQuote(`refs/heads/${branch}`)} >/dev/null; then
    :
  else
    conductive_ref_status=$?
    if [ "$conductive_ref_status" -eq 2 ]; then
      printf '%s\\n' ${shellQuote(`The branch \`${branch}\` is no longer on GitHub.`)} >&2
      exit ${missingExit}
    fi
  fi
  exit "$conductive_fetch_status"
fi`
}
