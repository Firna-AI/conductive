//! Strict per-segment URL decoding without URL normalization.

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
