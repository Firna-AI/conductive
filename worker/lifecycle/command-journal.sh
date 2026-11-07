set -eu
umask 077

command_directory=$1
mkdir -p -- "$command_directory"
(
  if ln -s "$BASHPID" "$command_directory/owner" 2>/dev/null; then
    : > "$command_directory/stdout"
    : > "$command_directory/stderr"
    set +e
    /bin/sh -c "$2" > "$command_directory/stdout" 2> "$command_directory/stderr"
    command_result=$?
    printf '%s\n' "$command_result" > "$command_directory/result.tmp"
    mv -- "$command_directory/result.tmp" "$command_directory/result"
  fi
) </dev/null >/dev/null 2>&1 &
launcher_pid=$!

stdout_offset=0
stderr_offset=0
while :; do
  command_result=
  if [ -f "$command_directory/result" ]; then
    command_result=$(cat -- "$command_directory/result")
  fi
  if [ -f "$command_directory/stdout" ]; then
    stdout_size=$(wc -c < "$command_directory/stdout")
    dd if="$command_directory/stdout" iflag=skip_bytes,count_bytes skip="$stdout_offset" count="$((stdout_size - stdout_offset))" status=none
    stdout_offset=$stdout_size
  fi
  if [ -f "$command_directory/stderr" ]; then
    stderr_size=$(wc -c < "$command_directory/stderr")
    dd if="$command_directory/stderr" iflag=skip_bytes,count_bytes skip="$stderr_offset" count="$((stderr_size - stderr_offset))" status=none >&2
    stderr_offset=$stderr_size
  fi
  if [ -n "$command_result" ]; then
    exit "$command_result"
  fi
  owner_pid=$(readlink -- "$command_directory/owner" 2>/dev/null || true)
  if [ -n "$owner_pid" ]; then
    if ! kill -0 "$owner_pid" 2>/dev/null && [ ! -f "$command_directory/result" ]; then
      exit 125
    fi
  elif ! kill -0 "$launcher_pid" 2>/dev/null && [ ! -L "$command_directory/owner" ]; then
    exit 125
  fi
  sleep 0.1
done
