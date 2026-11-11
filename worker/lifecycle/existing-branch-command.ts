import { shellQuote } from './commands'

export const BRANCH_NOT_FOUND_EXIT_CODE = 44

export function existingBranchFetch(
  directory: string,
  branch: string,
  turnId: string,
): string {
  const ref = `refs/heads/${branch}`
  const remote = `refs/remotes/origin/${branch}`
  return `set -eu
export CONDUCTIVE_TURN_ID=${shellQuote(turnId)}
cd ${shellQuote(directory)}
if git fetch origin ${shellQuote(`+${ref}:${remote}`)}; then
  :
else
  conductive_fetch_status=$?
  if git ls-remote --exit-code --heads origin ${shellQuote(ref)} >/dev/null; then
    exit "$conductive_fetch_status"
  else
    conductive_ref_status=$?
    if [ "$conductive_ref_status" -eq 2 ]; then
      exit ${BRANCH_NOT_FOUND_EXIT_CODE}
    fi
    exit "$conductive_fetch_status"
  fi
fi`
}

export function existingBranchCheckout(
  directory: string,
  branch: string,
  turnId: string,
): string {
  return `set -eu
export CONDUCTIVE_TURN_ID=${shellQuote(turnId)}
cd ${shellQuote(directory)}
git checkout -B ${shellQuote(branch)} --track ${shellQuote(`refs/remotes/origin/${branch}`)}`
}
