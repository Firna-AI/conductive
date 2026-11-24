//! The real computer enrollment exchange and credential persistence.

#![allow(clippy::unwrap_used)]

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::sync::Arc;

use cnd_computer::enrollment::{Enrollment, HttpEnrollment};
use cnd_computer::error::Error;
use cnd_computer::settings::{Paths, SavedSettings, Settings, SettingsStore};

mod support;

const CODE: &str = "ABCD-EFGH-JKMN-PQRS";

fn token() -> String {
    format!("cndc1.{}.{}", "a".repeat(64), "b".repeat(43))
}

#[tokio::test]
async fn exchanges_a_code_without_browser_headers_and_saves_private_settings() {
    let home = tempfile::tempdir().unwrap();
    let config = home.path().join("my-config");
    let paths = Paths::new(home.path(), Some(config.clone()), None).unwrap();
    let store = Arc::new(SavedSettings {
        path: paths.settings,
    });
    let expected_token = token();
    let body = serde_json::to_vec(&serde_json::json!({ "computerToken": expected_token })).unwrap();
    let (server, wire) = support::http(move |_| (200, body.clone()), 1).await;
    let enrollment = HttpEnrollment::new(store.clone()).unwrap();
    let exchanged = enrollment
        .enroll(
            CODE,
            server.parse().unwrap(),
            "http://[::1]:8000".parse().unwrap(),
        )
        .await;
    assert!(exchanged.is_ok(), "{exchanged:?}");

    let requests = wire.await.unwrap();
    let headers = requests[0].to_ascii_lowercase();
    assert!(headers.starts_with("post /v1/computer http/1.1\r\n"));
    assert!(headers.contains(&format!(
        "\r\nauthorization: bearer {}\r\n",
        CODE.to_ascii_lowercase()
    )));
    assert!(!headers.contains("\r\norigin:"));
    assert!(!headers.contains("\r\ncookie:"));
    let saved = store.read().await.unwrap().unwrap();
    assert_eq!(saved.token, expected_token);
    assert_eq!(
        saved.release_server.as_str().trim_end_matches('/'),
        "http://[::1]:8000"
    );
    assert_eq!(store.path, config.join("conductive/computer.json"));
    assert_eq!(
        fs::metadata(&store.path).unwrap().permissions().mode() & 0o777,
        0o600
    );
    assert_eq!(
        fs::metadata(config.join("conductive"))
            .unwrap()
            .permissions()
            .mode()
            & 0o777,
        0o700
    );
}

#[tokio::test]
async fn refused_code_preserves_the_saved_settings_and_names_new_code() {
    let home = tempfile::tempdir().unwrap();
    let paths = Paths::new(home.path(), None, None).unwrap();
    let store = Arc::new(SavedSettings {
        path: paths.settings,
    });
    store
        .save(&Settings {
            token: token(),
            origin: "https://api.conductive.build".parse().unwrap(),
            release_server: "https://runner.conductive.build".parse().unwrap(),
        })
        .unwrap();
    let before = fs::read(&store.path).unwrap();
    let (server, wire) = support::http(|_| (401, b"discarded peer text".to_vec()), 1).await;
    let result = HttpEnrollment::new(store.clone())
        .unwrap()
        .enroll(CODE, server.parse().unwrap(), server.parse().unwrap())
        .await;
    assert!(matches!(result, Err(Error::CodeRefused)), "{result:?}");
    let message = result.unwrap_err().to_string();
    assert!(message.contains("New code") && message.contains("1 hour"));
    assert!(!message.contains(CODE));
    assert!(!message.contains("discarded peer text"));
    assert_eq!(fs::read(&store.path).unwrap(), before);
    wire.await.unwrap();
}

#[tokio::test]
async fn rejects_a_bad_code_before_the_exchange_and_an_invalid_token_before_save() {
    let home = tempfile::tempdir().unwrap();
    let paths = Paths::new(home.path(), None, None).unwrap();
    let store = Arc::new(SavedSettings {
        path: paths.settings,
    });
    let (server, wire) = support::http(|_| (200, br#"{"computerToken":"bad"}"#.to_vec()), 1).await;
    let enrollment = HttpEnrollment::new(store.clone()).unwrap();
    let result = enrollment
        .enroll(
            "ABCI-EFGH-JKMN-PQRS",
            server.parse().unwrap(),
            server.parse().unwrap(),
        )
        .await;
    assert!(matches!(result, Err(Error::InvalidCode)), "{result:?}");

    let result = enrollment
        .enroll(CODE, server.parse().unwrap(), server.parse().unwrap())
        .await;
    assert!(
        matches!(result, Err(Error::EnrollmentUnavailable)),
        "{result:?}"
    );
    assert!(!store.path.exists());
    wire.await.unwrap();
}
