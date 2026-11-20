//! Request-aware byte ranges conditioned on the file's modification date.

use std::time::SystemTime;

use httpdate::HttpDate;
use hyper::Request;
use hyper::header::{IF_RANGE, RANGE};

use super::files::FileContent;

pub(super) enum Selection {
    Whole,
    Partial { start: u64, length: u64 },
    Unsatisfiable,
}

pub(super) fn select(request: &Request<()>, content: &FileContent) -> Selection {
    let headers = request.headers();
    if !headers.contains_key(RANGE)
        || !if_range_matches(request, content.modified)
        || headers.get_all(RANGE).iter().count() > 1
    {
        return Selection::Whole;
    }
    let Some(bytes) = headers
        .get(RANGE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("bytes="))
    else {
        return Selection::Whole;
    };
    if bytes.contains(',') {
        return Selection::Whole;
    }
    match single(bytes, content.size) {
        Some((start, length)) => Selection::Partial { start, length },
        None => Selection::Unsatisfiable,
    }
}

fn if_range_matches(request: &Request<()>, modified: SystemTime) -> bool {
    let mut values = request.headers().get_all(IF_RANGE).iter();
    let Some(value) = values.next() else {
        return true;
    };
    if values.next().is_some() {
        return false;
    }
    value
        .to_str()
        .ok()
        .and_then(|value| httpdate::parse_http_date(value).ok())
        .is_some_and(|date| HttpDate::from(date) == HttpDate::from(modified))
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
