# Contributing to Mnemo

Thank you for helping build Mnemo. The project is pre-alpha, so focused changes and clear design
discussion are especially valuable.

## Getting started

You need Git, CMake 3.24+, a C++20 compiler, and Qt 6.5+ with Widgets and Qt Test. The validated
Windows setup uses MSYS2 UCRT64; follow [the development guide](docs/development.md) for install,
configure, build, run, test, and VS Code instructions.

```powershell
git clone <repository-url>
cd Mnemo
./scripts/dev.ps1 build debug
./scripts/dev.ps1 test debug
```

## Repository layout

- `src/app`: application startup and metadata
- `src/ui`: Qt Widgets only; no save or provider algorithms
- `src/core`: game, backup, provider, and storage contracts and services
- `src/platform`: narrowly scoped operating-system integration
- `tests`: CTest-registered tests
- `game-definitions`: community-maintained game metadata
- `docs`: architecture and contributor documentation
- `assets`: resources and future approved artwork

## Code and tests

Use modern C++20, RAII, const correctness, scoped enums, and explicit ownership. Qt parent
ownership is appropriate for QObject UI trees. Avoid raw owning pointers, global mutable state,
singleton abuse, application-logic macros, and abstractions without an immediate use.

Run formatting with the repository `.clang-format`. Add focused tests for behavior changes and
keep core code testable without launching the GUI. Do not weaken warnings or unrelated tests.

## Pull requests

- Prefer focused pull requests with a clear motivation.
- Discuss major architecture, schema, or provider API changes before implementation.
- Follow the boundaries in [docs/architecture.md](docs/architecture.md).
- Update documentation when behavior or contributor workflows change.
- Use Conventional Commits where practical, such as `feat(ui): add library navigation`.
- Include screenshots only for genuine UI changes; do not create fake product screenshots.

## Game definitions

Read [docs/game-definitions.md](docs/game-definitions.md). A definition PR should identify the
game, launcher, OS, verified paths, and whether saves contain slots, worlds, profiles, or
characters. Keep support data-only and do not include executable code.

## Storage providers

Read [docs/providers.md](docs/providers.md) first. Open an issue before a new provider so its API,
authentication, capabilities, security, and platform support can be discussed. Provider code must
not include game knowledge or backup policy, and no secrets may be committed.

