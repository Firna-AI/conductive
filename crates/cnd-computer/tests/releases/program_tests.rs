//! Program downloads verify both the exact manifest and its archive.

use std::fs;
use std::os::unix::fs::PermissionsExt;

use cli_release_interface::ReleaseAssetInfo;
use cnd_computer::error::Error;
use cnd_computer::releases::http::HttpReleases;
use cnd_computer::releases::ports::Releases;
use cnd_release::files::sha256;
use cnd_release::manifest::{program_archive_key, program_manifest_key};
use cnd_release::signature::{ReleaseSigner, manifest_signature_key};
use cnd_release::version::LATEST_KEY;
use cnd_runner_interface::computer::operations::ComputerRelease;
use flate2::Compression;
use flate2::write::GzEncoder;

use super::fixtures::{Responses, VERSION, serve, signer};

const PROGRAM: &[u8] = b"fixture program";

fn archive() -> Vec<u8> {
    let mut tar = tar::Builder::new(GzEncoder::new(Vec::new(), Compression::default()));
    let mut header = tar::Header::new_gnu();
    header.set_size(PROGRAM.len() as u64);
    header.set_mode(0o755);
    header.set_cksum();
    tar.append_data(&mut header, "conductive", PROGRAM).unwrap();
    tar.into_inner().unwrap().finish().unwrap()
}

struct Signed {
    release: ComputerRelease,
    responses: Responses,
    manifest: String,
    signature: String,
    archive: String,
}

fn signed(signer: &ReleaseSigner, edit: impl FnOnce(&mut ReleaseAssetInfo)) -> Signed {
    let bytes = archive();
    let release = ComputerRelease {
        version: VERSION.into(),
        digest: sha256(&bytes),
    };
    let archive = program_archive_key(VERSION, &release.digest).unwrap();
    let manifest = program_manifest_key(VERSION, &release.digest).unwrap();
    let mut info = ReleaseAssetInfo {
        binary: "conductive".into(),
        version: VERSION.into(),
        target: "x86_64-unknown-linux-musl".into(),
        asset_name: "conductive-0.0.42-x86_64-unknown-linux-musl.tar.gz".into(),
        download_url: format!("https://runner.conductive.build/{archive}"),
        sha256: Some(release.digest.clone()),
    };
    edit(&mut info);
    let compact = serde_json::to_vec(&info).unwrap();
    let signature = manifest_signature_key(&compact);
    let responses = Responses::from([
        (
            signature.clone(),
            (200, signer.sign(&compact).unwrap().to_vec()),
        ),
        (manifest.clone(), (200, compact)),
        (archive.clone(), (200, bytes)),
    ]);
    Signed {
        release,
        responses,
        manifest,
        signature,
        archive,
    }
}

#[tokio::test]
async fn signed_compact_program_manifest_is_accepted_and_archive_is_cached() {
    let signer = signer();
    let cache = tempfile::tempdir().unwrap();
    let signed = signed(&signer, |_| {});
    let (server, wire) = serve(signed.responses, 5).await;
    let reader = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
    let server = server.parse().unwrap();
    let first = reader.program(&server, &signed.release).await;
    assert!(first.is_ok(), "{first:?}");
    let path = first.unwrap();
    assert_eq!(
        path,
        cache
            .path()
            .join("programs")
            .join(VERSION)
            .join(&signed.release.digest)
            .join("conductive")
    );
    assert_eq!(fs::read(&path).unwrap(), PROGRAM);
    assert_eq!(
        fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o755
    );
    assert_eq!(
        reader.program(&server, &signed.release).await.unwrap(),
        path
    );
    let requests = wire.await.unwrap();
    for (request, key) in requests.iter().zip([
        &signed.manifest,
        &signed.signature,
        &signed.archive,
        &signed.manifest,
        &signed.signature,
    ]) {
        assert!(request.starts_with(&format!("GET /{key} ")), "{request}");
    }
}

#[tokio::test]
async fn accepts_only_the_requested_signed_program_identity() {
    let signer = signer();
    for field in ["binary", "target", "version", "digest"] {
        let cache = tempfile::tempdir().unwrap();
        let signed = signed(&signer, |info| match field {
            "binary" => info.binary = "something-else".into(),
            "target" => info.target = "aarch64-unknown-linux-musl".into(),
            "version" => info.version = "0.0.43".into(),
            _ => info.sha256 = Some("a".repeat(64)),
        });
        let (server, wire) = serve(signed.responses, 3).await;
        let reader = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
        let result = reader
            .program(&server.parse().unwrap(), &signed.release)
            .await;
        wire.abort();
        let _ = wire.await;
        assert!(
            matches!(result, Err(Error::ReleaseInvalid)),
            "{field}: {result:?}"
        );
        assert_eq!(fs::read_dir(cache.path()).unwrap().count(), 0);
    }
}

#[tokio::test]
async fn distinguishes_missing_metadata_from_unavailable_metadata_and_checks_the_archive() {
    let signer = signer();
    for (file, status, body, count, unavailable) in [
        ("manifest", 404, Vec::new(), 1, false),
        ("manifest", 410, Vec::new(), 1, false),
        ("manifest", 503, Vec::new(), 1, true),
        ("signature", 404, Vec::new(), 2, false),
        ("signature", 410, Vec::new(), 2, false),
        ("signature", 503, Vec::new(), 2, true),
        ("signature", 200, vec![0; 64], 2, false),
        ("archive", 200, b"wrong digest".to_vec(), 3, false),
    ] {
        let cache = tempfile::tempdir().unwrap();
        let mut signed = signed(&signer, |_| {});
        let key = match file {
            "manifest" => signed.manifest,
            "signature" => signed.signature,
            _ => signed.archive,
        };
        signed.responses.insert(key, (status, body));
        let (server, wire) = serve(signed.responses, count).await;
        let reader = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
        let result = reader
            .program(&server.parse().unwrap(), &signed.release)
            .await;
        assert!(
            (unavailable && matches!(result, Err(Error::ReleaseUnavailable)))
                || (!unavailable && matches!(result, Err(Error::ReleaseInvalid))),
            "{file} {status}: {result:?}",
        );
        assert_eq!(fs::read_dir(cache.path()).unwrap().count(), 0);
        assert_eq!(wire.await.unwrap().len(), count);
    }
}

#[tokio::test]
async fn newest_version_signature_covers_the_exact_document_bytes() {
    let signer = signer();
    let cache = tempfile::tempdir().unwrap();
    let mut signed = signed(&signer, |_| {});
    let (_, mut exact) = signed.responses.remove(&signed.manifest).unwrap();
    exact.extend(b"\n ");
    signed.responses.remove(&signed.signature);
    signed.responses.insert(
        manifest_signature_key(&exact),
        (200, signer.sign(&exact).unwrap().to_vec()),
    );
    signed.responses.insert(LATEST_KEY.into(), (200, exact));
    let (server, wire) = serve(signed.responses, 3).await;
    let reader = HttpReleases::new(signer.public_key(), cache.path().to_owned()).unwrap();
    let server = server.parse().unwrap();
    let verified = reader.latest(&server).await;
    assert!(verified.is_ok(), "{verified:?}");
    let verified = verified.unwrap();
    assert_eq!(verified.identity(), &signed.release);
    let executable = reader.verified_program(&server, &verified).await.unwrap();
    assert_eq!(fs::read(executable).unwrap(), PROGRAM);
    assert!(wire.await.unwrap()[2].starts_with(&format!("GET /{} ", signed.archive)));
}
