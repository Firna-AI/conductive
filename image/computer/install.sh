#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$1" >&2
  exit "${2:-1}"
}

valid_url() {
  case "$1" in
    *[[:space:][:cntrl:]]*|*\\*|*'?'*|*'#'*) return 1 ;;
  esac
  printf '%s\n' "$1" | LC_ALL=C grep -Eiq \
    '^(https://([a-z0-9._~-]+|\[[0-9a-f:.]+\])|http://(127\.0\.0\.1|localhost|\[::1\]))(:[0-9]{1,5})?(/.*)?$' ||
    return 1
  authority="${1#*://}"
  authority="${authority%%/*}"
  host_and_port="${authority##*]}"
  case "$host_and_port" in
    *:*)
      port="${host_and_port##*:}"
      [ "$port" -gt 0 ] && [ "$port" -le 65535 ]
      ;;
    *) return 0 ;;
  esac
}

read_options() {
  code=
  origin=https://api.conductive.build
  release_server=https://runner.conductive.build
  while [ "$#" -gt 0 ]; do
    option="$1"
    case "$option" in
      --code|--origin|--release-server) ;;
      *) fail 'Unknown option. Use --code, --origin, or --release-server.' 2 ;;
    esac
    case "${2-}" in
      ''|--*) fail "$option needs a value." 2 ;;
    esac
    case "$option" in
      --code)
        code="$2"
        if [ "${#code}" -ne 19 ] ||
          ! printf '%s\n' "$code" | LC_ALL=C grep -Eq '^([0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$'; then
          fail 'Enter the code from the app.' 2
        fi
        ;;
      --origin)
        valid_url "$2" || fail 'Use HTTPS for --origin, or HTTP with a loopback host.' 2
        origin="$2"
        ;;
      --release-server)
        valid_url "$2" || fail 'Use HTTPS for --release-server, or HTTP with a loopback host.' 2
        release_server="$2"
        ;;
    esac
    shift 2
  done
  [ -n "$code" ] || fail 'Use --code with the code from the app.' 2
}

need() {
  printf '%s\n' "$1" >&2
  missing=1
}

check_server() {
  missing=0
  [ "$(uname -s 2>/dev/null)" = Linux ] || need 'Use a Linux server.'
  [ "$(uname -m 2>/dev/null)" = x86_64 ] || need 'Use an x86_64 server.'
  env test -d /run/systemd/system || need 'Run systemd on the server.'
  podman_version="$(podman --version 2>/dev/null)" || podman_version=
  podman_version="${podman_version#podman version }"
  [ "${podman_version%%.*}" -ge 4 ] 2>/dev/null || need 'Install Podman 4 or later.'
  [ "$(stat -f -c %T /sys/fs/cgroup 2>/dev/null)" = cgroup2fs ] || need 'Enable cgroups v2.'
  for command in newuidmap newgidmap curl sha256sum tar; do
    command -v "$command" >/dev/null 2>&1 || need "Install $command."
  done
  [ "$missing" = 0 ] || exit 1
}

as_root() {
  if [ "$installer_uid" = 0 ]; then
    "$@"
  else
    sudo -- "$@"
  fi
}

as_computer() {
  set -- env "HOME=$computer_home" "XDG_RUNTIME_DIR=$runtime_dir" "DBUS_SESSION_BUS_ADDRESS=$bus_address" "$@"
  if [ "$installer_uid" = 0 ]; then
    runuser -u conductive -- "$@"
  else
    sudo -u conductive -- "$@"
  fi
}

prepare_user() {
  account_existed=1
  if ! account="$(getent passwd conductive)"; then
    account_existed=0
    as_root useradd --create-home --home-dir /home/conductive --shell /usr/sbin/nologin --user-group conductive ||
      fail 'Could not create the conductive user.'
    account="$(getent passwd conductive)" || fail 'Could not find the conductive user.'
  fi
  IFS=: read -r _ _ computer_uid _ _ computer_home _ <<EOF
$account
EOF
  case "$computer_uid" in
    ''|0|*[!0-9]*) fail 'The conductive user needs a non-root user ID.' ;;
  esac
  case "$computer_home" in
    /*) ;;
    *) fail 'The conductive user needs a home directory.' ;;
  esac
}

subordinate_ids() {
  ranges=
  if env test -e "$1"; then
    ranges="$(as_root cat "$1")" || return 1
  fi
  printf '%s\n' "$ranges" | awk -F: -v uid="$computer_uid" '
    BEGIN { highest = 99999 }
    $2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/ && $3 > 0 {
      last = $2 + $3 - 1
      if (last > highest) highest = last
      if ($1 == "conductive" || $1 == uid) assigned = 1
    }
    END { printf "%d %.0f\n", assigned, highest }
  '
}

prepare_ranges() {
  uid_ranges="$(subordinate_ids /etc/subuid)" || fail 'Could not read subordinate user IDs.'
  gid_ranges="$(subordinate_ids /etc/subgid)" || fail 'Could not read subordinate group IDs.'
  has_uids="${uid_ranges%% *}"
  has_gids="${gid_ranges%% *}"
  if [ "$has_uids" = 1 ] && [ "$has_gids" = 1 ]; then
    return
  fi
  highest="${uid_ranges#* }"
  if [ "${gid_ranges#* }" -gt "$highest" ]; then
    highest="${gid_ranges#* }"
  fi
  last="$((highest + 65536))"
  [ "$last" -lt 4294967295 ] || fail 'No subordinate ID range of 65,536 IDs is available.'
  range="$((highest + 1))-$last"
  set --
  if [ "$has_uids" = 0 ]; then set -- "$@" --add-subuids "$range"; fi
  if [ "$has_gids" = 0 ]; then set -- "$@" --add-subgids "$range"; fi
  as_root usermod "$@" conductive || fail 'Could not add subordinate IDs for the conductive user.'
}

prepare_manager() {
  drop_in_dir="/etc/systemd/system/user@$computer_uid.service.d"
  drop_in="$drop_in_dir/conductive-delegate.conf"
  printf '[Service]\nDelegate=cpu cpuset io memory pids\n' > "$temporary/delegate.conf" ||
    fail 'Could not prepare the systemd settings.'
  if ! cmp -s "$temporary/delegate.conf" "$drop_in"; then
    if ! as_root install -d -m 0755 "$drop_in_dir" ||
      ! as_root install -m 0644 "$temporary/delegate.conf" "$drop_in"; then
      fail 'Could not install the systemd settings.'
    fi
  fi
  as_root systemctl daemon-reload || fail 'Could not reload systemd settings.'
  as_root loginctl enable-linger conductive || fail 'Could not enable lingering for the conductive user.'

  runtime_dir="/run/user/$computer_uid"
  bus_address="unix:path=$runtime_dir/bus"
  remaining=30
  until as_root env test -S "$runtime_dir/bus"; do
    [ "$remaining" -gt 0 ] || fail 'The conductive user bus did not start. Check systemd-logind.'
    sleep 1
    remaining="$((remaining - 1))"
  done
}

download() {
  curl --disable --fail --silent --show-error --location --globoff \
    --proto "$release_protocols" --output "$2" -- "$1"
}

release_field() {
  awk -F '"' -v key="$1" '
    NF == 5 && $2 == key && $1 ~ /^[[:space:]]*$/ &&
      $3 ~ /^[[:space:]]*:[[:space:]]*$/ && $5 ~ /^[[:space:]]*,?[[:space:]]*$/ {
      print $4
      matches++
    }
    END { if (matches != 1) exit 1 }
  ' "$temporary/latest.json"
}

install_release() {
  release_base="$release_server"
  while [ "${release_base%/}" != "$release_base" ]; do release_base="${release_base%/}"; done
  case "$release_base" in
    [Hh][Tt][Tt][Pp]://*) release_protocols='=http,https' ;;
    *) release_protocols='=https' ;;
  esac
  target=x86_64-unknown-linux-musl
  download "$release_base/releases/latest/conductive/$target" "$temporary/latest.json" ||
    fail 'Could not download the release details.'
  if ! version="$(release_field version)" ||
    ! printf '%s\n' "$version" | LC_ALL=C grep -Eq '^0\.0\.[1-9][0-9]*$'; then
    fail 'The release details contain an invalid version.'
  fi
  if ! sha256="$(release_field sha256)" ||
    ! printf '%s\n' "$sha256" | LC_ALL=C grep -Eq '^[0-9a-f]{64}$'; then
    fail 'The release details contain an invalid SHA-256 digest.'
  fi

  archive="conductive-$version-$target.tar.gz"
  download "$release_base/releases/download/conductive/$version/$sha256/$archive" "$temporary/release.tar.gz" ||
    fail 'Could not download the release archive.'
  if ! checksum="$(sha256sum < "$temporary/release.tar.gz")" ||
    [ "${checksum%% *}" != "$sha256" ]; then
    fail 'The release archive did not match its SHA-256 digest.'
  fi
  if ! tar -xzOf "$temporary/release.tar.gz" conductive > "$temporary/conductive" ||
    [ ! -s "$temporary/conductive" ]; then
    fail 'Could not extract the Conductive program.'
  fi

  # Publish the program and the link with renames in the user's release store.
  # shellcheck disable=SC2016
  as_computer sh -eu -c '
    store="$HOME/.local/share/conductive"
    target="versions/$1"
    mkdir -p "$store/$target"
    stage="$(mktemp -d "$store/.install.XXXXXX")"
    cleanup() { rm -rf -- "$stage"; }
    trap cleanup 0
    trap "exit 1" HUP INT TERM
    cat > "$stage/conductive"
    chmod 0755 "$stage/conductive"
    mv -fT -- "$stage/conductive" "$store/$target/conductive"
    ln -s -- "$target" "$stage/current"
    mv -fT -- "$stage/current" "$store/current"
  ' sh "$version" < "$temporary/conductive" || fail 'Could not install the Conductive program.'
}

prepare_program() {
  program="$computer_home/.local/share/conductive/current/conductive"
  if as_computer timeout -k 1 10 "$program" --version </dev/null \
    > "$temporary/program-version" 2>/dev/null &&
    LC_ALL=C awk '
      /^conductive 0\.0\.[1-9][0-9]*$/ { valid = 1 }
      END { exit !(NR == 1 && valid) }
    ' "$temporary/program-version"; then
    return
  fi

  if [ "$account_existed" = 1 ]; then
    printf '%s\n' 'The Conductive program is missing or cannot run. Installing the newest release.' >&2
  fi
  install_release
}

enroll_and_start() {
  if report="$(as_computer "$program" computer check)"; then
    printf '%s\n' "$report"
  else
    printf '%s\n' "$report" >&2
    fail 'Fix the failed checks above, then run the install command again.'
  fi
  if ! printf '%s\n' "$code" |
    as_computer "$program" computer enroll --origin "$origin" --release-server "$release_server"; then
    fail 'The own computer could not exchange its code. Read the message above.'
  fi
  as_computer "$program" computer service || fail 'Could not start the Conductive service.'
}

show_result() {
  status_prefix='sudo -u conductive --'
  log_prefix='sudo '
  if [ "$installer_uid" = 0 ]; then
    status_prefix='runuser -u conductive --'
    log_prefix=
  fi
  printf '%s\n' \
    'Your own computer is installed. It connects to the Conductive app.' \
    'Show the service state with this command.' \
    "$status_prefix env XDG_RUNTIME_DIR=$runtime_dir DBUS_SESSION_BUS_ADDRESS=$bus_address systemctl --user status conductive-computer.service" \
    'Show the service log with this command.' \
    "${log_prefix}journalctl _UID=$computer_uid _SYSTEMD_USER_UNIT=conductive-computer.service"
}

main() {
  read_options "$@"
  # The user conductive cannot read the folder of each caller, and Podman
  # stops when it cannot read its working folder.
  cd / || fail 'Could not change to the root folder.'
  check_server
  installer_uid="$(id -u)" || fail 'Could not read your user ID.'
  if [ "$installer_uid" != 0 ] && ! command -v sudo >/dev/null 2>&1; then
    fail 'Install sudo or run the installer as root.'
  fi
  prepare_user
  prepare_ranges
  temporary="$(mktemp -d)" || fail 'Could not create a temporary directory.'
  trap 'rm -rf -- "$temporary"' 0
  trap 'fail "The installation was interrupted."' HUP INT TERM
  prepare_manager
  prepare_program
  enroll_and_start
  show_result
}

main "$@"
