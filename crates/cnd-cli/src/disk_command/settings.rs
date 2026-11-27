//! Read the disk line from the environment or the saved provider exports.

use std::ffi::OsStr;
use std::path::Path;
use std::str;

use cnd_runner::config::DISK_LINE_ENV;

use super::{DiskError, DiskIo, DiskResult, IoContext, read_optional};

pub(super) const ENV_FILE: &str = "/run/ascii-secrets/env.sh";

pub(super) fn configured_line(disk: &dyn DiskIo, value: Option<&OsStr>) -> DiskResult<Option<u64>> {
    if let Some(value) = value {
        return decimal_line(value.as_encoded_bytes(), DISK_LINE_ENV).map(Some);
    }
    let Some(script) =
        read_optional(disk, Path::new(ENV_FILE)).during("read saved disk settings")?
    else {
        return Ok(None);
    };
    exported_value(&script)
        .map(|value| decimal_line(value, ENV_FILE))
        .transpose()
}

pub(super) fn decimal_line(value: &[u8], location: &'static str) -> DiskResult<u64> {
    str::from_utf8(value)
        .ok()
        .filter(|value| value.bytes().all(|byte| byte.is_ascii_digit()))
        .and_then(|value| value.parse().ok())
        .ok_or(DiskError::InvalidLine { location })
}

fn exported_value(script: &[u8]) -> Option<&[u8]> {
    let mut quote = None;
    let mut continued = false;
    let mut value = None;
    for line in script.split(|byte| *byte == b'\n') {
        let text = if quote.is_some() || continued {
            line
        } else {
            let Some(export) = line
                .trim_ascii_start()
                .strip_prefix(b"export")
                .filter(|text| matches!(text.first(), Some(b' ' | b'\t')))
            else {
                continue;
            };
            let assignment = unquote(export.trim_ascii());
            if let Some(match_value) = assignment
                .strip_prefix(DISK_LINE_ENV.as_bytes())
                .and_then(|rest| rest.strip_prefix(b"="))
            {
                value = Some(unquote(match_value));
            }
            export
        };
        (quote, continued) = quote_state(text, quote);
    }
    value
}

fn unquote(bytes: &[u8]) -> &[u8] {
    match bytes {
        [b'\'', value @ .., b'\''] | [b'"', value @ .., b'"'] => value,
        _ => bytes,
    }
}

fn quote_state(line: &[u8], mut quote: Option<u8>) -> (Option<u8>, bool) {
    let mut escaped = false;
    for &byte in line {
        if escaped {
            escaped = false;
            continue;
        }
        match (quote, byte) {
            (None | Some(b'"'), b'\\') => escaped = true,
            (None, b'\'' | b'"') => quote = Some(byte),
            (Some(open), close) if open == close => quote = None,
            _ => {}
        }
    }
    (quote, escaped)
}
