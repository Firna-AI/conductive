//! Exact E2B ingress identity and provider header isolation on the Rust transport.

use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio_tungstenite::{
    accept_hdr_async, connect_async,
    tungstenite::{Message, client::IntoClientRequest},
};

use crate::support::fixture::Fixture;
use crate::support::ingress::TestIngress;
use crate::support::upgrade::CaptureHeaders;
use crate::support::wire::{TestResult, head, reply};

const PRIVATE: &str = "E2b-Traffic-Access-Token: private-traffic\r\nX-Access-Token: private-envd\r\nE2b-Sandbox-Id: sandbox-one\r\nE2b-Sandbox-Port: 41235\r\n";
const PRIVATE_NAMES: [&str; 4] = [
    "e2b-traffic-access-token",
    "x-access-token",
    "e2b-sandbox-id",
    "e2b-sandbox-port",
];

#[tokio::test]
async fn accepts_only_current_exact_e2b_alias_and_strips_private_http_headers() -> TestResult {
    let target = TcpListener::bind(("127.0.0.1", 0)).await?;
    let port = target.local_addr()?.port();
    let served = tokio::spawn(async move {
        let mut seen = Vec::new();
        for _ in 0..2 {
            let (mut stream, _) = target.accept().await?;
            seen.push(head(&mut stream).await?);
            reply(&mut stream, "200 OK", "", "app response").await?;
        }
        TestResult::Ok(seen)
    });
    let identity = Arc::new(TestIngress::new());
    let relay = Fixture::with_ingress(identity.clone()).await?;
    identity.alias(relay.port, 41235);
    let headers =
        |host: &str| format!("Host: {host}\r\nX-Conductive-Preview-Port: {port}\r\n{PRIVATE}");
    let answer = relay
        .send(&headers("41235-sandbox-one.eu.e2b.test"))
        .await?;
    assert!(answer.starts_with("HTTP/1.1 200"), "{answer}");
    assert!(answer.ends_with("app response"));
    for host in [
        "41236-sandbox-one.eu.e2b.test",
        "41235-foreign-sandbox.eu.e2b.test",
        "41235-sandbox-one.other.test",
    ] {
        let answer = relay.send(&headers(host)).await?;
        assert!(answer.starts_with("HTTP/1.1 403"), "{host}: {answer}");
    }
    identity.alias(relay.port, 41236);
    assert!(
        relay
            .send(&headers("41235-sandbox-one.eu.e2b.test"))
            .await?
            .starts_with("HTTP/1.1 403")
    );
    assert!(
        relay
            .send(&headers("41236-sandbox-one.eu.e2b.test"))
            .await?
            .starts_with("HTTP/1.1 200")
    );
    let duplicate = format!(
        "Host: 41236-sandbox-one.eu.e2b.test\r\n{}",
        headers("41236-sandbox-one.eu.e2b.test")
    );
    assert!(relay.send(&duplicate).await?.starts_with("HTTP/1.1 403"));
    for incoming in served.await?? {
        assert!(
            incoming.contains(&format!("host: localhost:{port}\r\n")),
            "{incoming}"
        );
        for name in PRIVATE_NAMES {
            assert!(!incoming.contains(name), "{incoming}");
        }
    }
    let loop_target = TcpListener::bind(("127.0.0.1", 0)).await?;
    let alias = loop_target.local_addr()?.port();
    let loop_requests = Arc::new(AtomicUsize::new(0));
    let count = loop_requests.clone();
    let loop_server = tokio::spawn(async move {
        if let Ok((mut stream, _)) = loop_target.accept().await {
            count.fetch_add(1, Ordering::SeqCst);
            let _ = reply(&mut stream, "200 OK", "", "loop entry").await;
        }
    });
    identity.alias(relay.port, alias);
    let answer = relay
        .send(&format!(
            "Host: {alias}-sandbox-one.eu.e2b.test\r\nX-Conductive-Preview-Port: {alias}\r\n"
        ))
        .await?;
    assert!(answer.starts_with("HTTP/1.1 400"), "{answer}");
    assert_eq!(loop_requests.load(Ordering::SeqCst), 0);
    loop_server.abort();
    Ok(())
}

#[tokio::test]
async fn relays_binary_websocket_through_e2b_alias_without_private_headers() -> TestResult {
    let target = TcpListener::bind(("127.0.0.1", 0)).await?;
    let port = target.local_addr()?.port();
    let served = tokio::spawn(async move {
        let (stream, _) = target.accept().await?;
        let (capture, captured) = oneshot::channel();
        let mut socket = accept_hdr_async(stream, CaptureHeaders(capture)).await?;
        let incoming = captured.await?;
        let message = socket.next().await.ok_or("missing binary frame")??;
        socket.send(message).await?;
        TestResult::Ok(incoming)
    });
    let identity = Arc::new(TestIngress::new());
    let relay = Fixture::with_ingress(identity.clone()).await?;
    identity.alias(relay.port, 41235);
    let mut request = format!("ws://127.0.0.1:{}/live", relay.port).into_client_request()?;
    for (name, value) in [
        ("host", "41235-sandbox-one.eu.e2b.test".to_owned()),
        ("x-conductive-preview-port", port.to_string()),
        ("e2b-traffic-access-token", "private-traffic".into()),
        ("x-access-token", "private-envd".into()),
        ("e2b-sandbox-id", "sandbox-one".into()),
        ("e2b-sandbox-port", "41235".into()),
    ] {
        request.headers_mut().insert(name, value.parse()?);
    }
    let (mut client, response) = connect_async(request).await?;
    assert_eq!(response.status(), 101);
    client.send(Message::Binary(vec![1, 2, 3].into())).await?;
    assert_eq!(
        client.next().await.ok_or("missing binary echo")??,
        Message::Binary(vec![1, 2, 3].into())
    );
    let incoming = served.await??;
    assert!(
        incoming.contains(&format!("\"host\": \"localhost:{port}\"")),
        "{incoming}"
    );
    for name in PRIVATE_NAMES {
        assert!(!incoming.contains(name), "{incoming}");
    }
    Ok(())
}
