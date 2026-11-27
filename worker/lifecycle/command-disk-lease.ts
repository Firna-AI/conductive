import { privilegedCommand } from '../terminal/privileged'

const leaseDirectory = '/run/conductive-disk/leases'
const holdLock = '/run/conductive-disk-hold.lock'

const openLease = privilegedCommand(`set -eu
umask 077
exec 9>>${holdLock}
flock -x 9
now=$(date +%s)
if mkdir -p -- ${leaseDirectory}; then
  printf '%s %s\\n' "$1" "$((now + 25 * 60))" > ${leaseDirectory}/"$2" || true
fi
for setting in /sys/fs/ext4/*/reserved_clusters; do
  [ -f "$setting" ] || continue
  printf '4096\\n' > "$setting" || true
done`)

const closeLease = privilegedCommand(`umask 077
(flock -x 9 && rm -f -- ${leaseDirectory}/"$1") 9>>${holdLock}
exec /opt/conductive/current/conductive disk hold`)

/** Hooks for the workspace journal owner. The lock also covers the CLI hold. */
export const workspaceDiskLease = `open_disk_lease() {
  disk_lease_id=$(printf '%s' "$command_directory" | sha256sum) || return 0
  disk_lease_id=\${disk_lease_id%% *}
  ${openLease} conductive-disk "$1" "$disk_lease_id" 2>/dev/null || true
}
close_disk_lease() {
  [ -n "$disk_lease_id" ] || return 0
  ${closeLease} conductive-disk "$disk_lease_id" 2>/dev/null || true
}`
