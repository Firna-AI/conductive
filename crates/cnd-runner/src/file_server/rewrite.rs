//! Byte-stream replacement of local `file:` URL prefixes.

use std::iter;
use std::mem;
use std::path::{Path, PathBuf};

use bytes::Bytes;

use super::font_files::SYSTEM_FONT_FOLDERS;

/// Keeps a bounded incomplete prefix between output chunks.
pub(super) struct FileAddresses {
    origin: String,
    repository: PathBuf,
    lookahead: usize,
    pending: Vec<u8>,
    follows_scheme_byte: bool,
}

impl FileAddresses {
    /// Use the accepted preview origin and the request's repository folder.
    pub(super) fn new(origin: String, repository: PathBuf) -> Self {
        const MARGIN: usize = 64;
        let longest_folder = SYSTEM_FONT_FOLDERS
            .iter()
            .fold(repository.as_os_str().len(), |longest, folder| {
                longest.max(folder.len())
            });
        Self {
            origin,
            repository,
            lookahead: longest_folder + MARGIN,
            pending: Vec::new(),
            follows_scheme_byte: false,
        }
    }

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
        while let Some(&byte) = input.first() {
            if byte.eq_ignore_ascii_case(&b'f') && !self.follows_scheme_byte {
                let window = &input[..input.len().min(self.lookahead)];
                match served_prefix(window, &self.repository) {
                    Prefix::Local(path_start) => {
                        output.extend_from_slice(self.origin.as_bytes());
                        output.push(b'/');
                        input = &input[path_start..];
                    }
                    Prefix::Incomplete if input.len() < self.lookahead => {
                        self.pending.extend_from_slice(input);
                        break;
                    }
                    Prefix::Incomplete | Prefix::Other => {}
                }
            }
            let byte = input[0];
            output.push(byte);
            self.follows_scheme_byte =
                byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'-' | b'.');
            input = &input[1..];
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

fn trim_separators(path: &[u8]) -> &[u8] {
    let start = path
        .iter()
        .position(|&byte| !is_separator(byte))
        .unwrap_or(path.len());
    &path[start..]
}

/// Return the start of a non-empty path after its leading separators.
fn served_prefix(input: &[u8], repository: &Path) -> Prefix {
    let prefix = local_prefix(input);
    let Prefix::Local(length) = prefix else {
        return prefix;
    };
    let path = trim_separators(&input[length..]);
    if path.is_empty() {
        return Prefix::Incomplete;
    }
    let mut result = Prefix::Other;
    for folder in iter::once(repository).chain(SYSTEM_FONT_FOLDERS.map(Path::new)) {
        match folder_match(path, folder) {
            FolderMatch::Complete => return Prefix::Local(input.len() - path.len()),
            FolderMatch::Incomplete => result = Prefix::Incomplete,
            FolderMatch::Other => {}
        }
    }
    result
}

enum FolderMatch {
    Complete,
    Incomplete,
    Other,
}

/// Compare literal folder segments and allow runs of either separator between them.
fn folder_match(mut path: &[u8], folder: &Path) -> FolderMatch {
    let Ok(relative) = folder.strip_prefix("/") else {
        return FolderMatch::Other;
    };
    for component in relative.components() {
        let segment = component.as_os_str().as_encoded_bytes();
        let Some(rest) = path.strip_prefix(segment) else {
            return if segment.starts_with(path) {
                FolderMatch::Incomplete
            } else {
                FolderMatch::Other
            };
        };
        match rest.first() {
            Some(&byte) if is_separator(byte) => path = trim_separators(rest),
            None => return FolderMatch::Incomplete,
            Some(_) => return FolderMatch::Other,
        }
    }
    FolderMatch::Complete
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
