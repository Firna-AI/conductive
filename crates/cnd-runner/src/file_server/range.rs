//! Single byte-range selection with whole-file fallback for multiple ranges.

pub(super) enum Selection {
    Whole,
    Partial { start: u64, length: u64 },
    Unsatisfiable,
}

pub(super) fn select(header: Option<&str>, size: u64) -> Selection {
    let Some(bytes) = header.and_then(|value| value.strip_prefix("bytes=")) else {
        return Selection::Whole;
    };
    if bytes.contains(',') {
        return Selection::Whole;
    }
    match single(bytes, size) {
        Some((start, length)) => Selection::Partial { start, length },
        None => Selection::Unsatisfiable,
    }
}

fn number(text: &str) -> Option<u64> {
    if text.is_empty() || !text.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    text.parse().ok()
}

fn single(bytes: &str, size: u64) -> Option<(u64, u64)> {
    if size == 0 {
        return None;
    }
    let (start, end) = bytes.trim().split_once('-')?;
    if start.is_empty() {
        let length = number(end)?.min(size);
        return (length > 0).then_some((size - length, length));
    }
    let start = number(start)?;
    if start >= size {
        return None;
    }
    let end = if end.is_empty() {
        size - 1
    } else {
        number(end)?.min(size - 1)
    };
    if end < start {
        None
    } else {
        Some((start, end - start + 1))
    }
}
