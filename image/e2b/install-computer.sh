#!/bin/sh
set -eu

computer_scripts=$(dirname -- "$0")
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  at-spi2-core dbus-x11 fonts-liberation gnupg libx11-6 libxcomposite1 \
  libxcursor1 libxdamage1 libxfixes3 libxi6 libxkbcommon0 libxrandr2 libxrender1 libxtst6 \
  openbox x11-utils xvfb
sh "$computer_scripts/install-chrome.sh"

computer_stage=$(mktemp -d)
trap 'rm -rf "$computer_stage"' EXIT HUP INT TERM
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
  https://github.com/trycua/cua/releases/download/cua-driver-rs-v0.54.0/cua-driver-rs-0.54.0-linux-x86_64-binary.tar.gz \
  --output "$computer_stage/cua-driver.tar.gz"
printf '%s  %s\n' \
  53b38ee3a5aeed39bdcd3acee0bea98a0eed3315e9df2d8af73345680c49868e \
  "$computer_stage/cua-driver.tar.gz" | sha256sum --check --status
tar -xzf "$computer_stage/cua-driver.tar.gz" -C "$computer_stage" \
  cua-driver cua-cursor-theme
install -m 755 "$computer_stage/cua-driver" /usr/local/bin/cua-driver
install -m 755 "$computer_stage/cua-cursor-theme" /usr/local/bin/cua-cursor-theme

install -d -m 755 /usr/local/lib/conductive-e2b
for computer_file in display-start.py computer-config.py desktop-session.conf; do
  install -m 644 "$computer_scripts/$computer_file" "/usr/local/lib/conductive-e2b/$computer_file"
done
for computer_unit in display desktop chrome computer-config; do
  install -m 644 "$computer_scripts/$computer_unit.service" \
    "/etc/systemd/system/conductive-e2b-$computer_unit.service"
done
systemctl daemon-reload
systemctl enable conductive-e2b-display.service conductive-e2b-desktop.service \
  conductive-e2b-chrome.service conductive-e2b-computer-config.service
systemctl start conductive-e2b-display.service conductive-e2b-desktop.service \
  conductive-e2b-chrome.service conductive-e2b-computer-config.service
