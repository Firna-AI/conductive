//! Bounded streaming bodies for whole files and byte ranges.

use std::io;

use bytes::Bytes;
use futures_util::{TryStreamExt, stream};
use http_body_util::{BodyExt, StreamBody, combinators::UnsyncBoxBody};
use hyper::body::Frame;
use tokio::io::AsyncReadExt;
use tokio_util::io::ReaderStream;

use super::files::FileReader;

/// File bytes or an empty response without a full-file allocation.
pub type Body = UnsyncBoxBody<Bytes, io::Error>;

pub(super) fn empty() -> Body {
    StreamBody::new(stream::empty::<io::Result<Frame<Bytes>>>()).boxed_unsync()
}

pub(super) fn file(reader: Box<dyn FileReader>, length: u64) -> Body {
    StreamBody::new(ReaderStream::new(reader.take(length)).map_ok(Frame::data)).boxed_unsync()
}
