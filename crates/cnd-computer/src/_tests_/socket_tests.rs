//! The upgrade carries a sensitive credential on the one computer route.

#![expect(
    clippy::unwrap_used,
    reason = "Invalid fixture addresses must fail the test."
)]

use tokio_tungstenite::tungstenite::http::header::{AUTHORIZATION, COOKIE, ORIGIN};

use crate::settings::{ServerUrl, Settings};

use super::upgrade;

#[test]
fn secures_the_upgrade_and_allows_cleartext_only_on_loopback() {
    let settings = Settings {
        origin: "https://example.com/path?ignored=yes".parse().unwrap(),
        token: "fixture-token".into(),
        release_server: "https://runner.conductive.build".parse().unwrap(),
    };
    let request = upgrade(&settings).unwrap();
    assert_eq!(request.uri().to_string(), "wss://example.com/v1/computer");
    assert_eq!(request.headers()[AUTHORIZATION], "Bearer fixture-token");
    assert!(request.headers()[AUTHORIZATION].is_sensitive());
    assert!(!request.headers().contains_key(ORIGIN));
    assert!(!request.headers().contains_key(COOKIE));
    for address in [
        "http://127.0.0.1:54321",
        "http://localhost:54321",
        "http://[::1]:54321",
    ] {
        let settings = Settings {
            origin: address.parse().unwrap(),
            ..settings.clone()
        };
        assert_eq!(upgrade(&settings).unwrap().uri().scheme_str(), Some("ws"));
    }
    for address in [
        "http://example.com",
        "http://127.0.0.2",
        "http://localhost.example.com",
        "ftp://localhost",
    ] {
        assert!(address.parse::<ServerUrl>().is_err());
    }
}
