#!/bin/sh
set -eu
root=/opt/conductive
system="$root/current/system"
for unit in "$system"/*.service "$system"/*.socket "$system"/*.timer "$system"/*.path; do
  install -m 644 "$unit" "/etc/systemd/system/$(basename "$unit")"
done
install -d -m 755 /etc/udev/rules.d /usr/local/bin
install -m 644 "$system/60-conductive-disk-cache.rules" /etc/udev/rules.d/60-conductive-disk-cache.rules
ln -sfn "$root/current/conductive" /usr/local/bin/conductive
ln -sfn "$system/github-cli.sh" /usr/local/bin/gh
ln -sfn "$root/current/conductive" /usr/local/bin/conductive-git-credential
git config --system --replace-all credential.helper /usr/local/bin/conductive-git-credential
git config --system credential.useHttpPath true
rm -f /etc/systemd/system/conductive-update-confirm.service
systemctl daemon-reload
systemctl enable conductive-runner.service conductive-preview-relay.socket conductive-preview-relay.service \
  conductive-update-check.timer conductive-terminal.service conductive-disk-hold.timer conductive-disk-hold.path
# Boat starts the relay at boot, before the runner's pre-start step applies a
# release. A running relay restarts here, so it runs the active release too.
# The socket holds the port meanwhile. A stopped relay stays stopped.
systemctl --no-block try-restart conductive-preview-relay.service ||
  echo "conductive: the preview relay did not restart; it keeps its earlier release" >&2
