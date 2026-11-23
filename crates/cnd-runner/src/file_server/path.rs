//! Strict per-segment URL decoding without URL normalization.

use std::path::{Component, Path};

/// Strip a folder prefix only when all of its path segments match.
pub(super) fn strip_folder<'a>(path: &'a Path, folder: &Path) -> Option<&'a Path> {
    path.strip_prefix(folder).ok()
}

/// Percent-encode each UTF-8 segment of an absolute file address.
pub(super) fn address(path: &Path) -> Option<String> {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut address = String::new();
    for component in path.components() {
        if let Component::Normal(segment) = component {
            address.push('/');
            for byte in segment.to_str()?.bytes() {
                if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
                    address.push(char::from(byte));
                } else {
                    address.push('%');
                    address.push(char::from(HEX[usize::from(byte >> 4)]));
                    address.push(char::from(HEX[usize::from(byte & 15)]));
                }
            }
        }
    }
    Some(address)
}

/// Decode an HTTP path to repository-relative segments.
pub(super) fn decode(path: &str) -> Option<String> {
    if path == "/" {
        return Some(String::new());
    }
    let path = path.strip_prefix('/')?;
    let path = path.strip_suffix('/').unwrap_or(path);
    path.split('/')
        .map(segment)
        .collect::<Option<Vec<_>>>()
        .map(|parts| parts.join("/"))
}

fn segment(segment: &str) -> Option<String> {
    let mut source = segment.bytes();
    let mut bytes = Vec::with_capacity(segment.len());
    while let Some(byte) = source.next() {
        bytes.push(if byte == b'%' {
            let high = char::from(source.next()?).to_digit(16)?;
            let low = char::from(source.next()?).to_digit(16)?;
            (high * 16 + low) as u8
        } else {
            byte
        });
    }
    let value = String::from_utf8(bytes).ok()?;
    if matches!(value.as_str(), "" | "." | ".." | ".git") || value.contains(['/', '\0']) {
        None
    } else {
        Some(value)
    }
}
