# Architecture

Mnemo uses explicit boundaries so game knowledge, save operations, and storage integrations
can evolve independently.

```text
UI Layer
    ↓
Application / Core Services
    ↓
Game Definitions  |  Save Engine  |  Storage Providers
    ↓
Filesystem / OS / Remote APIs
```

## Layers

### UI layer

Qt Widgets display state and translate user intent into service calls. The UI may ask a future
backup service to create a backup; it must not copy save files, resolve game paths, or call a
remote API itself.

### Application and core services

Application services will coordinate workflows and policy. The save engine will validate,
copy, version, and restore save data. It may call a storage provider, but must not contain
Google OAuth, MEGA API, or game-specific path logic.

### Game definition system

Definitions answer, "Where are this game's saves?" A loader will parse data-only definitions,
expand platform paths, and expose save groups. Definitions discover or describe save data;
they never perform backups.

### Storage provider system

Providers answer, "Where should backups be stored?" Each provider handles its own transport,
availability, authentication, and remote metadata behind `IStorageProvider`. Providers do not
know where a game's saves live or decide backup policy.

### Platform boundary

OS-specific discovery, credential storage, and filesystem behavior belong under `src/platform`.
Cross-platform code should use Qt or standard C++ facilities instead of Windows-only APIs when
practical.

## Dependency rules

- UI depends on application services, never provider implementations.
- Save services may depend on provider interfaces, never remote-provider internals.
- Provider implementations depend on their APIs and platform facilities, never game knowledge.
- Game definitions and loaders contain no backup or restore behavior.
- Core logic should remain testable without launching the GUI.

These boundaries are directional rather than a mandate to create abstractions before they are
needed. Major changes should be discussed before implementation.

## Settings and application data

Simple preferences will use `QSettings`. Authentication tokens must not be stored as plaintext
settings; provider work should use appropriate OS credential storage. Runtime data will use
`QStandardPaths::AppDataLocation`, which maps to the proper per-user location instead of a
hardcoded drive or home-directory folder.

