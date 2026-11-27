import { privilegedCommand } from '../terminal/privileged'

const leaseDirectory = '/run/conductive-disk/leases'
const holdLock = '/run/conductive-disk-hold.lock'
const holdCommand = '/opt/conductive/current/conductive disk hold'

const openLease = privilegedCommand(`set -eu
umask 077
(
  flock -x 9 &&
  mkdir -p -- ${leaseDirectory} &&
  now=$(date +%s) &&
  printf '%s %s\\n' "$1" "$((now + 25 * 60))" > ${leaseDirectory}/"$2"
) 9>>${holdLock} &&
exec ${holdCommand}`)

const releaseRoot = privilegedCommand(`set -eu
root=$(findmnt --raw --noheadings --first-only --direction backward --output MAJ:MIN,FSTYPE --mountpoint /)
case "$root" in
  *' ext4')
    device=$(readlink -- "/dev/block/\${root% ext4}")
    printf '4096\\n' > "/sys/fs/ext4/\${device##*/}/reserved_clusters"
    ;;
esac`)

const closeLease = privilegedCommand(`umask 077
(flock -x 9 && rm -f -- ${leaseDirectory}/"$1") 9>>${holdLock}
exec ${holdCommand}`)

/** The workspace journal and CLI share a lock for lease changes. */
export const workspaceDiskLease = `open_disk_lease() {
  disk_lease_id=$(printf '%s' "$command_directory" | sha256sum) || return 0
  disk_lease_id=\${disk_lease_id%% *}
  if ${openLease} conductive-disk "$1" "$disk_lease_id" 2>/dev/null; then
    return
  fi
  # Read the fallback policy as the sandbox user.
  if (
    unset CONDUCTIVE_DISK_LINE_BYTES
    . /run/ascii-secrets/env.sh || exit 1
    [[ \${CONDUCTIVE_DISK_LINE_BYTES:-} =~ ^[0-9]+$ ]]
  ) 2>/dev/null; then
    ${releaseRoot} conductive-disk 2>/dev/null || true
  fi
}
close_disk_lease() {
  [ -n "$disk_lease_id" ] || return 0
  ${closeLease} conductive-disk "$disk_lease_id" 2>/dev/null || true
}`
