# Storage providers

The provider API is experimental and may change throughout pre-alpha. It is currently a C++
source interface, not a stable binary plugin ABI.

## Lifecycle

1. Mnemo constructs a configured provider.
2. `initialize()` prepares non-interactive resources and validates configuration.
3. `testConnection()` performs an explicit health check when requested.
4. Save services use upload, download, list, metadata, existence, and removal operations.
5. QObject or RAII ownership tears down resources safely.

## Responsibilities

`IStorageProvider` isolates object storage operations from backup policy. An implementation owns
transport details, provider-specific paths, authentication, availability checks, and conversion
of native failures into useful provider errors. The save engine owns backup layout, retention,
integrity policy, and conflict decisions.

Providers may eventually advertise capabilities such as atomic replacement, checksums,
versioning, quotas, or server-side copy. Capability discovery should be added only when a real
implementation needs it.

## Errors and integrity

Expected failures should be returned as structured errors with safe, actionable messages.
Provider code must not silently treat partial uploads as success. Upload and download workflows
will eventually verify size and checksums, use temporary objects where possible, and preserve
enough context for recovery without logging secrets.

## Authentication

OAuth credentials and access tokens must never be committed, logged, or stored in plaintext
`QSettings`. Future remote providers should use platform credential storage and follow least-
privilege scopes. Authentication UI must remain separate from the backup engine.

## Contributing a provider

Future Dropbox, OneDrive, pCloud, S3, WebDAV, and other providers should implement the shared
contract without modifying game discovery or the save engine. Start with an issue describing
the service, API, authentication, platforms, and required capabilities. The third-party provider
story and compatibility policy are not stable yet.

