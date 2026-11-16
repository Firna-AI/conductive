//! Connection reuse by the provider's proxy, with large replies.

use tokio::io::AsyncWriteExt;
use tokio::net::TcpListener;

use crate::support::fixture::Fixture;
use crate::support::wire::{TestResult, head, read_reply};

/// Larger than one socket buffer, as the script of a dev server often is.
const BODY_BYTES: usize = 600 * 1024;

async fn serve_large(target: &TcpListener, fill: u8) -> TestResult<String> {
    let (mut stream, _) = target.accept().await?;
    let request = head(&mut stream).await?;
    stream
        .write_all(format!("HTTP/1.1 200 OK\r\nContent-Length: {BODY_BYTES}\r\n\r\n").as_bytes())
        .await?;
    stream.write_all(&vec![fill; BODY_BYTES]).await?;
    Ok(request.to_lowercase())
}

#[tokio::test]
async fn keeps_the_client_connection_open_for_the_next_request() -> TestResult {
    let target = TcpListener::bind(("127.0.0.1", 0)).await?;
    let port = target.local_addr()?.port();
    let served = tokio::spawn(async move {
        let first = serve_large(&target, b'a').await?;
        let second = serve_large(&target, b'b').await?;
        TestResult::Ok((first, second))
    });
    let relay = Fixture::new().await?;
    let mut client = relay
        .stream("GET", "/first.js", &relay.headers(port))
        .await?;
    let (headers, body) = read_reply(&mut client).await?;
    assert!(headers.starts_with("HTTP/1.1 200"), "{headers}");
    assert!(headers.contains("x-conductive-relay: 1\r\n"), "{headers}");
    assert!(!headers.contains("connection: close"), "{headers}");
    assert_eq!(body, vec![b'a'; BODY_BYTES]);

    client
        .write_all(format!("GET /second.js HTTP/1.1\r\n{}\r\n", relay.headers(port)).as_bytes())
        .await?;
    let (headers, body) = read_reply(&mut client).await?;
    assert!(headers.starts_with("HTTP/1.1 200"), "{headers}");
    assert_eq!(body, vec![b'b'; BODY_BYTES]);

    let (first, second) = served.await??;
    assert!(first.starts_with("get /first.js http/1.1\r\n"), "{first}");
    assert!(
        second.starts_with("get /second.js http/1.1\r\n"),
        "{second}"
    );
    // Each target connection still ends after its reply, as before.
    assert!(first.contains("connection: close\r\n"), "{first}");
    Ok(())
}
