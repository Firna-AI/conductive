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
            if self.skip_slashes {
                if is_separator(byte) {
                    input = rest;
                    continue;
                }
                self.skip_slashes = false;
            } else if byte.eq_ignore_ascii_case(&b'f') && !self.follows_scheme_byte {
                match local_prefix(input) {
                    Prefix::Local(length) => {
                        output.push(b'/');
                        input = &input[length..];
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

fn is_separator(byte: u8) -> bool {
    matches!(byte, b'/' | b'\\')
}

/// Two identical separators can introduce an authority. A mixed pair starts a path.
fn local_prefix(input: &[u8]) -> Prefix {
    const SCHEME: &[u8] = b"file:";
    const LOCAL_HOST: &[u8] = b"localhost";
    if !agrees_with(input, SCHEME) {
        return Prefix::Other;
    }
    let Some((&first, after_first)) = input.get(SCHEME.len()..).and_then(<[u8]>::split_first)
    else {
        return Prefix::Incomplete;
    };
    if !is_separator(first) {
        return Prefix::Other;
    }
    let Some((&second, authority)) = after_first.split_first() else {
        return Prefix::Incomplete;
    };
    if first != second {
        return Prefix::Local(SCHEME.len() + 1);
    }
    if authority.first().copied().is_some_and(is_separator) {
        return Prefix::Local(SCHEME.len() + 3);
    }
    if !agrees_with(authority, LOCAL_HOST) {
        return Prefix::Other;
    }
    let Some(&separator) = authority.get(LOCAL_HOST.len()) else {
        return Prefix::Incomplete;
    };
    if is_separator(separator) {
        Prefix::Local(SCHEME.len() + 2 + LOCAL_HOST.len() + 1)
    } else {
        Prefix::Other
    }
}
