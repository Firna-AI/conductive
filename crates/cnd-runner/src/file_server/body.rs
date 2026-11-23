//! Bounded streaming bodies for whole files and byte ranges.

use std::{future, io};

use bytes::Bytes;
use futures_util::{StreamExt, TryStreamExt, stream};
use http_body_util::{BodyExt, StreamBody, combinators::UnsyncBoxBody};
use hyper::body::Frame;
use tokio::io::AsyncReadExt;
use tokio_util::io::ReaderStream;

use super::files::FileReader;
use super::html;
use super::rewrite::FileAddresses;

/// File bytes or an empty response without a full-file allocation.
pub type Body = UnsyncBoxBody<Bytes, io::Error>;

/// Make a body with no data frames.
pub(super) fn empty() -> Body {
    StreamBody::new(stream::empty::<io::Result<Frame<Bytes>>>()).boxed_unsync()
}

/// Send a generated body whose full bytes are already available.
pub(super) fn bytes(content: Bytes) -> Body {
    StreamBody::new(stream::iter([Ok(Frame::data(content))])).boxed_unsync()
}

/// Stream up to the opened file size or the selected range length.
pub(super) fn file(reader: Box<dyn FileReader>, length: u64) -> Body {
    StreamBody::new(ReaderStream::new(reader.take(length)).map_ok(Frame::data)).boxed_unsync()
}

/// Decide whether to read or change the start of a document.
pub(super) enum ChangedDocument {
    /// Read the encoding and consider inserting the system font link.
    Html {
        /// Whether the system font stylesheet has a rule.
        stylesheet: bool,
    },
    /// Stream only the address changes for CSS and SVG.
    Text,
}

/// Stream changed text and keep UTF-16 HTML bytes intact.
pub(super) fn changed(reader: Box<dyn FileReader>, length: u64, document: ChangedDocument) -> Body {
    let chunks = stream::once(async move {
        let mut reader = reader.take(length);
        let mut prefix = Vec::new();
        if let ChangedDocument::Html { stylesheet } = document {
            let limit = if stylesheet {
                html::SCAN_LIMIT as u64
            } else {
                2
            };
            (&mut reader).take(limit).read_to_end(&mut prefix).await?;
            if stylesheet && !html::is_utf16(&prefix) {
                html::insert_link(&mut prefix);
            }
        }
        let rewrite = !html::is_utf16(&prefix);
        let start = (!prefix.is_empty()).then(|| Ok(Bytes::from(prefix)));
        let chunks = stream::iter(start).chain(ReaderStream::new(reader));
        let mut addresses = FileAddresses::default();
        Ok::<_, io::Error>(
            chunks
                .map_ok(Some)
                .chain(stream::iter([Ok(None)]))
                .try_filter_map(move |chunk| {
                    let output = if rewrite {
                        addresses.transform(chunk)
                    } else {
                        chunk
                    };
                    future::ready(Ok(output))
                }),
        )
    })
    .try_flatten();
    StreamBody::new(chunks.map_ok(Frame::data)).boxed_unsync()
}
