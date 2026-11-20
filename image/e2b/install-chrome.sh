#!/bin/sh
set -eu

chrome_stage=$(mktemp -d)
trap 'rm -rf "$chrome_stage"' EXIT HUP INT TERM
install -d -m 700 "$chrome_stage/gnupg"
google_fingerprint=EB4C1BFD4F042F6DDDCCEC917721F63BD38B4796

curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
  https://dl.google.com/linux/linux_signing_key.pub --output "$chrome_stage/google.pub"
gpg --batch --homedir "$chrome_stage/gnupg" --with-colons \
  --show-keys "$chrome_stage/google.pub" > "$chrome_stage/keys"
awk -F: -v expected="$google_fingerprint" '
  $1 == "pub" { primary = 1; next }
  primary && $1 == "fpr" { if ($10 == expected) found = 1; primary = 0 }
  END { exit !found }
' "$chrome_stage/keys"
gpg --batch --homedir "$chrome_stage/gnupg" --import "$chrome_stage/google.pub"
install -d -m 755 /usr/share/keyrings
gpg --batch --homedir "$chrome_stage/gnupg" --export "$google_fingerprint" \
  > /usr/share/keyrings/conductive-google-chrome.gpg
chmod 644 /usr/share/keyrings/conductive-google-chrome.gpg
printf '%s\n' \
  'deb [arch=amd64 signed-by=/usr/share/keyrings/conductive-google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main' \
  > /etc/apt/sources.list.d/google-chrome.list
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends google-chrome-stable
