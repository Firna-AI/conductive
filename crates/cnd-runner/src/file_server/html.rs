//! Locate the font stylesheet link within the bounded start of an HTML page.

use super::stylesheet::ADDRESS;

/// Maximum number of original bytes examined for the link.
pub(super) const SCAN_LIMIT: usize = 8 * 1024;

/// Detect a byte order mark that makes the browser decode the page as UTF-16.
pub(super) fn is_utf16(prefix: &[u8]) -> bool {
    prefix.starts_with(&[0xff, 0xfe]) || prefix.starts_with(&[0xfe, 0xff])
}

/// Add the link after the doctype or at the start after a UTF-8 byte order mark.
pub(super) fn insert_link(prefix: &mut Vec<u8>, origin: &str) {
    if let Some(offset) = insertion_point(prefix) {
        let link = format!("<link rel=\"stylesheet\" href=\"{origin}{ADDRESS}\">");
        prefix.splice(offset..offset, link.bytes());
    }
}

enum Item {
    Skip,
    Doctype,
    Content,
}

fn insertion_point(prefix: &[u8]) -> Option<usize> {
    const UTF8_BOM: &[u8] = b"\xef\xbb\xbf";
    let start = if prefix.starts_with(UTF8_BOM) {
        UTF8_BOM.len()
    } else {
        0
    };
    let mut offset = start;
    loop {
        let untrimmed = prefix.get(offset..)?;
        let remaining = untrimmed.trim_ascii_start();
        offset += untrimmed.len() - remaining.len();
        let (item, consumed) = classify(remaining)?;
        offset += consumed;
        if offset >= SCAN_LIMIT {
            return None;
        }
        match item {
            Item::Skip => {}
            Item::Doctype => return Some(offset),
            Item::Content => return Some(start),
        }
    }
}

fn classify(bytes: &[u8]) -> Option<(Item, usize)> {
    if *bytes.first()? != b'<' {
        return Some((Item::Content, 1));
    }
    if let Some(comment) = bytes.strip_prefix(b"<!--") {
        return Some((Item::Skip, 4 + comment_end(comment)?));
    }
    if bytes
        .get(..9)
        .is_some_and(|start| start.eq_ignore_ascii_case(b"<!DOCTYPE"))
    {
        return Some((Item::Doctype, 9 + angle_end(&bytes[9..])?));
    }
    match *bytes.get(1)? {
        b'!' | b'?' => Some((Item::Skip, 2 + angle_end(&bytes[2..])?)),
        b'/' if bytes.get(2)?.is_ascii_alphabetic() => Some((Item::Content, 3)),
        b'/' => Some((Item::Skip, 2 + angle_end(&bytes[2..])?)),
        _ => Some((Item::Content, 2)),
    }
}

fn angle_end(bytes: &[u8]) -> Option<usize> {
    bytes
        .iter()
        .position(|&byte| byte == b'>')
        .map(|index| index + 1)
}

/// HTML comments can end with `>` or `->` immediately after the opener.
fn comment_end(bytes: &[u8]) -> Option<usize> {
    if bytes.starts_with(b">") {
        return Some(1);
    }
    if bytes.starts_with(b"->") {
        return Some(2);
    }
    bytes.iter().enumerate().find_map(|(index, &byte)| {
        (byte == b'>' && (bytes[..index].ends_with(b"--") || bytes[..index].ends_with(b"--!")))
            .then_some(index + 1)
    })
}
