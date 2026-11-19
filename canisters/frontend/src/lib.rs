//! The public directory is the only asset source. Upgrading code replaces the
//! whole website. There is no asset administration interface or stable store.
use ic_asset_certification::{Asset, AssetConfig, AssetEncoding, AssetFallbackConfig, AssetRouter};
use ic_cdk::{init, post_upgrade, query};
use ic_http_certification::{
    CERTIFICATE_EXPRESSION_HEADER_NAME, DefaultCelBuilder, DefaultResponseCertification,
    HeaderField, HttpCertification, HttpCertificationPath, HttpCertificationTree,
    HttpCertificationTreeEntry, HttpRequest, HttpResponse, Method, StatusCode,
    utils::add_v2_certificate_header,
};
use include_dir::{Dir, File, include_dir};
use std::{cell::RefCell, collections::BTreeMap, rc::Rc};

static ASSETS_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/public");
include!("../policy.rs");

struct Head {
    response: HttpResponse<'static>,
    entry: HttpCertificationTreeEntry<'static>,
}
struct Site {
    get: AssetRouter<'static>,
    tree: Rc<RefCell<HttpCertificationTree>>,
    heads: BTreeMap<String, Head>,
    missing: Head,
}
thread_local! { static SITE: RefCell<Option<Site>> = const { RefCell::new(None) }; }

fn files(dir: &'static Dir<'static>, out: &mut Vec<&'static File<'static>>) {
    out.extend(dir.files());
    for child in dir.dirs() {
        files(child, out);
    }
}

fn headers(path: &str) -> Vec<HeaderField> {
    let cache = if path.ends_with(".flac") {
        "public, max-age=31536000, immutable"
    } else {
        "no-cache"
    };
    SECURITY_HEADERS
        .iter()
        .copied()
        .chain([
            ("cache-control", cache),
            ("cross-origin-resource-policy", "same-origin"),
        ])
        .map(|(k, v)| (k.into(), v.into()))
        .collect()
}

fn mime(path: &str) -> Option<&'static str> {
    Some(match path.rsplit_once('.')?.1 {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "mjs" => "text/javascript; charset=utf-8",
        "json" => "application/json",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        "bin" => "application/octet-stream",
        "did" | "md" => "text/plain; charset=utf-8",
        "flac" => "audio/flac",
        _ => return None,
    })
}

fn head(url: &str, file: &File<'_>, missing: bool) -> Head {
    let path = file.path().to_str().expect("UTF-8 path");
    let cel = DefaultCelBuilder::full_certification()
        .with_response_certification(DefaultResponseCertification::response_header_exclusions(
            vec![],
        ))
        .build();
    let mut metadata = headers(path);
    metadata.extend([
        (
            "content-type".into(),
            mime(path).expect("known MIME").into(),
        ),
        ("content-length".into(), file.contents().len().to_string()),
        (CERTIFICATE_EXPRESSION_HEADER_NAME.into(), cel.to_string()),
    ]);
    let response = HttpResponse::builder()
        .with_status_code(if missing {
            StatusCode::NOT_FOUND
        } else {
            StatusCode::OK
        })
        .with_headers(metadata)
        .build();
    let request = HttpRequest::builder()
        .with_method(Method::HEAD)
        .with_url(url)
        .build();
    let leaf =
        HttpCertification::full(&cel, &request, &response, None).expect("HEAD certification");
    let path = if missing {
        HttpCertificationPath::wildcard(url.to_owned())
    } else {
        HttpCertificationPath::exact(url.to_owned())
    };
    Head {
        response,
        entry: HttpCertificationTreeEntry::new(path, leaf),
    }
}

fn build_site() -> Site {
    let tree = Rc::new(RefCell::new(HttpCertificationTree::default()));
    let mut get = AssetRouter::with_tree(tree.clone());
    let mut directory = Vec::new();
    files(&ASSETS_DIR, &mut directory);
    directory.sort_by_key(|file| file.path());
    let mut configs = Vec::new();
    let mut assets = Vec::new();
    let mut heads = BTreeMap::new();
    for file in directory {
        let path = file.path().to_str().expect("UTF-8 path");
        assets.push(Asset::new(path, file.contents()));
        if path.ends_with(".gz") {
            continue;
        }
        let content_type = mime(path).unwrap_or_else(|| panic!("Unknown public MIME for {path}"));
        let aliases = if path == "index.html" {
            vec!["/".into()]
        } else {
            vec![]
        };
        let fallback = if path == "404.html" {
            vec![AssetFallbackConfig {
                scope: "/".into(),
                status_code: Some(StatusCode::NOT_FOUND),
            }]
        } else {
            vec![]
        };
        let encodings = ASSETS_DIR
            .get_file(format!("{path}.gz"))
            .map(|_| vec![AssetEncoding::Gzip.default_config()])
            .unwrap_or_default();
        configs.push(AssetConfig::File {
            path: path.into(),
            content_type: Some(content_type.into()),
            headers: headers(path),
            fallback_for: fallback,
            aliased_by: aliases,
            encodings,
        });
        let url = format!("/{path}");
        heads.insert(url.clone(), head(&url, file, false));
        if path == "index.html" {
            heads.insert("/".into(), head("/", file, false));
        }
    }
    get.certify_assets(assets, configs)
        .expect("certify embedded public files");
    let missing = head(
        "/",
        ASSETS_DIR.get_file("404.html").expect("branded 404"),
        true,
    );
    for asset in heads.values().chain(std::iter::once(&missing)) {
        tree.borrow_mut().insert(&asset.entry);
    }
    Site {
        get,
        tree,
        heads,
        missing,
    }
}

fn initialize() {
    let site = build_site();
    ic_cdk::api::certified_data_set(site.tree.borrow().root_hash());
    SITE.with_borrow_mut(|slot| *slot = Some(site));
}

#[init]
fn init() {
    initialize();
}

#[post_upgrade]
fn post_upgrade() {
    initialize();
}

fn error(status: StatusCode) -> HttpResponse<'static> {
    HttpResponse::builder()
        .with_status_code(status)
        .with_headers(headers(""))
        .build()
}

fn serve(site: &Site, request: &HttpRequest<'_>, certificate: &[u8]) -> HttpResponse<'static> {
    match *request.method() {
        Method::GET => site
            .get
            .serve_asset(certificate, request)
            .unwrap_or_else(|_| error(StatusCode::INTERNAL_SERVER_ERROR)),
        Method::HEAD => {
            if !request.body().is_empty() {
                return error(StatusCode::BAD_REQUEST);
            }
            let Ok(path) = request.get_path() else {
                return error(StatusCode::BAD_REQUEST);
            };
            let asset = site.heads.get(&path).unwrap_or(&site.missing);
            let witness = site
                .tree
                .borrow()
                .witness(&asset.entry, &path)
                .expect("embedded HEAD witness");
            let mut response = asset.response.clone();
            add_v2_certificate_header(
                certificate,
                &mut response,
                &witness,
                &asset.entry.path.to_expr_path(),
            );
            response
        }
        _ => error(StatusCode::METHOD_NOT_ALLOWED),
    }
}

#[query]
fn http_request(request: HttpRequest<'_>) -> HttpResponse<'static> {
    if request.get_path().is_err() {
        return error(StatusCode::BAD_REQUEST);
    }
    let Some(certificate) = ic_cdk::api::data_certificate() else {
        return error(StatusCode::INTERNAL_SERVER_ERROR);
    };
    SITE.with_borrow(|site| match site {
        Some(site) => serve(site, &request, &certificate),
        None => error(StatusCode::INTERNAL_SERVER_ERROR),
    })
}

ic_cdk::export_candid!();
