import { shellQuote } from './commands'

function stageOwner(stage: string): string {
  return stage.slice(0, stage.lastIndexOf('/'))
}

/** Drop other jobs' stages. A repository change holds the workspace reservation. */
export function sweepCloneStages(stage: string): string {
  const owner = stageOwner(stage)
  const root = shellQuote(stageOwner(owner))
  const name = shellQuote(stage.slice(owner.length + 1))
  return `if [ -d ${root} ] && [ ! -L ${root} ]; then
  for conductive_stage in ${root}/*/${name}; do
    [ "$conductive_stage" != ${shellQuote(stage)} ] &&
      [ ! -L "\${conductive_stage%/*}" ] && [ -d "$conductive_stage" ] || continue
    rm -rf -- "$conductive_stage"
    rmdir -- "\${conductive_stage%/*}" 2>/dev/null || :
  done
fi`
}

/** Remove one job's stage without following a link in place of its directory. */
export function removeCloneStage(stage: string): string {
  const owner = shellQuote(stageOwner(stage))
  return `if [ ! -L ${owner} ]; then
  rm -rf -- ${shellQuote(stage)} && { rmdir -- ${owner} 2>/dev/null || :; }
fi`
}
