//! Byte-stream replacement of local `file:` URL prefixes.

use std::mem;

use bytes::Bytes;

/// Keeps an incomplete prefix and a slash run between output chunks.
#[derive(Default)]
pub(super) struct FileAddresses {
    pending: Vec<u8>,
    follows_scheme_byte: bool,
    skip_slashes: bool,
}

impl FileAddresses {
    /// Rewrite a chunk or flush an incomplete prefix at the end of the stream.
    pub(super) fn transform(&mut self, chunk: Option<Bytes>) -> Option<Bytes> {
        let output = match chunk {
            None => mem::take(&mut self.pending),
            Some(chunk) if self.pending.is_empty() => self.rewrite(&chunk),
            Some(chunk) => {
                let mut input = mem::take(&mut self.pending);
                input.extend_from_slice(&chunk);
                self.rewrite(&input)
            }
        };
        (!output.is_empty()).then(|| Bytes::from(output))
    }

    fn rewrite(&mut self, mut input: &[u8]) -> Vec<u8> {
        let mut output = Vec::with_capacity(input.len());
        while let Some((&byte, rest)) = input.split_first() {
            if self.skip_slashes && byte == b'/' {
                input = rest;
                continue;
            }
            self.skip_slashes = false;
            if byte.eq_ignore_ascii_case(&b'f') && !self.follows_scheme_byte {
                match local_prefix(input) {
                    Prefix::Local(length) => {
                        output.push(b'/');
                        input = &input[length..];
                        self.follows_scheme_byte = false;
                        self.skip_slashes = true;
                        continue;
                    }
                    Prefix::Incomplete => {
                        self.pending.extend_from_slice(input);
                        break;
                    }
                    Prefix::Other => {}
                }
            }
            output.push(byte);
            self.follows_scheme_byte =
                byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'-' | b'.');
            input = rest;
        }
        output
    }
}

enum Prefix {
    Local(usize),
    Incomplete,
    Other,
}

fn agrees_with(input: &[u8], prefix: &[u8]) -> bool {
    let length = input.len().min(prefix.len());
    input[..length].eq_ignore_ascii_case(&prefix[..length])
}

fn local_prefix(input: &[u8]) -> Prefix {
    const SINGLE_SLASH: &[u8] = b"file:/";
    const LOCAL_HOST: &[u8] = b"localhost/";
    if !agrees_with(input, SINGLE_SLASH) {
        return Prefix::Other;
    }
    let Some((&slash, after_slash)) = input
        .get(SINGLE_SLASH.len()..)
        .and_then(<[u8]>::split_first)
    else {
        return Prefix::Incomplete;
    };
    if slash != b'/' {
        return Prefix::Local(SINGLE_SLASH.len());
    }
    if after_slash.starts_with(b"/") {
        return Prefix::Local(SINGLE_SLASH.len() + 2);
    }
    if !agrees_with(after_slash, LOCAL_HOST) {
        return Prefix::Other;
    }
    if after_slash.len() < LOCAL_HOST.len() {
        return Prefix::Incomplete;
    }
    Prefix::Local(SINGLE_SLASH.len() + 1 + LOCAL_HOST.len())
}
