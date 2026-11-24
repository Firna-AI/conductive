//! Fixed scripts run inside the container. Environment data enters on stdin.

pub(super) const SET_ENVIRONMENT: &str = r#"set -eu
install -d -m 0700 -o user -g "$(id -gn user)" /run/ascii-secrets
exec runuser -u user -- /bin/sh -c '
set -eu
umask 077
file=$(mktemp /run/ascii-secrets/.env.XXXXXX)
trap '"'"'rm -f -- "$file"'"'"' EXIT
cat > "$file"
chmod 0600 "$file"
mv -fT -- "$file" /run/ascii-secrets/env.sh
'
"#;

pub(super) const COPY_BOOTSTRAP: &str = r#"set -eu
umask 077
install -d -m 0700 /run/conductive-bootstrap
file=$(mktemp /run/conductive-bootstrap/.conductive.XXXXXX)
trap 'rm -f -- "$file"' EXIT
cat > "$file"
chmod 0755 "$file"
mv -fT -- "$file" /run/conductive-bootstrap/conductive
"#;

pub(super) const APPLY_BOOTSTRAP: &str = r#"set -eu
umask 022
program=/run/conductive-bootstrap/conductive
trap 'rm -rf -- /run/conductive-bootstrap' EXIT
"$program" update check --bootstrap --release "$1" --digest "$2" --server "$3"
"$program" update apply --release "$1"
/opt/conductive/current/conductive update started
test "$(readlink -f /opt/conductive/current)" = "/opt/conductive/versions/$1"
systemctl restart conductive-host.service
"#;
