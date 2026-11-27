umask 077

truncate_settled_output() {
  find "$workspace_journal_root/workspace" -mindepth 4 -maxdepth 4 \
    -type f -name result ! -newermt '30 minutes ago' \
    -exec /bin/sh -c '
      for result do
        for output in "${result%/*}/stdout" "${result%/*}/stderr"; do
          if [ -f "$output" ] && [ ! -L "$output" ]; then
            truncate -c -s 0 -- "$output"
          fi
        done
      done
    ' conductive-journal-cleanup {} + || true
}

command_directory=$1
result_file="$command_directory/result"
mkdir -p -- "$command_directory"
(
  if ln -s "$BASHPID" "$command_directory/owner" 2>/dev/null; then
    if [ -n "$workspace_journal_root" ]; then
      truncate_settled_output
    fi
    if declare -F open_disk_lease >/dev/null; then
      open_disk_lease "$BASHPID"
    fi
    : > "$command_directory/stdout"
    : > "$command_directory/stderr"
    if [ -n "$workspace_journal_root" ]; then
      printf '125\n' > "$result_file.tmp"
    fi
    command_result=0
    /bin/sh -c "$2" > "$command_directory/stdout" 2> "$command_directory/stderr" || command_result=$?
    if [ -n "$workspace_journal_root" ]; then
      # Keep the allocated block until the status has been written.
      printf '%s\n' "$command_result" | dd of="$result_file.tmp" conv=notrunc status=none
      truncate -s "$((${#command_result} + 1))" -- "$result_file.tmp"
    else
      printf '%s\n' "$command_result" > "$result_file.tmp"
    fi
    mv -T -- "$result_file.tmp" "$result_file"
    if declare -F close_disk_lease >/dev/null; then
      close_disk_lease
    fi
  fi
) </dev/null >/dev/null 2>&1 &
launcher_pid=$!

stdout_offset=0
stderr_offset=0
while :; do
  command_result=
  if [ -f "$result_file" ]; then
    if ! IFS= read -r command_result < "$result_file" ||
      [[ ! $command_result =~ ^(0|[1-9][0-9]{0,2})$ ]] || (( command_result > 255 )); then
      command_result=125
    fi
  fi
  if [ -f "$command_directory/stdout" ]; then
    stdout_size=$(wc -c < "$command_directory/stdout")
    if (( stdout_size > stdout_offset )); then
      dd if="$command_directory/stdout" iflag=skip_bytes,count_bytes skip="$stdout_offset" count="$((stdout_size - stdout_offset))" status=none
    fi
    stdout_offset=$stdout_size
  fi
  if [ -f "$command_directory/stderr" ]; then
    stderr_size=$(wc -c < "$command_directory/stderr")
    if (( stderr_size > stderr_offset )); then
      dd if="$command_directory/stderr" iflag=skip_bytes,count_bytes skip="$stderr_offset" count="$((stderr_size - stderr_offset))" status=none >&2
    fi
    stderr_offset=$stderr_size
  fi
  if [ -n "$command_result" ]; then
    wait "$launcher_pid" || true
    exit "$command_result"
  fi
  owner_pid=$(readlink -- "$command_directory/owner" 2>/dev/null || true)
  if [ -n "$owner_pid" ]; then
    if ! kill -0 "$owner_pid" 2>/dev/null && [ ! -f "$result_file" ]; then
      exit 125
    fi
  elif ! kill -0 "$launcher_pid" 2>/dev/null && [ ! -L "$command_directory/owner" ]; then
    exit 125
  fi
  sleep 0.1
done
