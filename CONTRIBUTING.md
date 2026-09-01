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

## Branching workflow

`main` is Mnemo's protected release and integration branch. It should always build, must not be
used for direct feature work, and should receive changes through pull requests. Do not push
feature work directly to `main`.

Working branches are temporary and use these prefixes:

- `feature/<name>` for new functionality
- `fix/<name>` for normal bug fixes
- `docs/<name>` for documentation-only changes
- `refactor/<name>` for internal cleanup without intended behavior changes
- `release/<version>` for temporary release stabilization, once releases actually exist
- `hotfix/<name>` for urgent fixes to released versions
- `chore/<name>` for repository maintenance and tooling

There is no permanent `develop` branch. Create a branch for one focused change and delete it after
merge. The preferred workflow is:

1. Update `main`.
2. Create a working branch.
3. Make focused commits.
4. Push the working branch.
5. Open a pull request into `main`.
6. Complete review and CI.
7. Squash merge the pull request.
8. Delete the working branch.

```bash
git switch main
git pull
git switch -c feature/local-provider

git add .
git commit -m "feat(provider): add local provider"
git push -u origin feature/local-provider
```

After the pull request is merged:

```bash
git switch main
git pull
git branch -d feature/local-provider
```

## Commit convention

Conventional Commits are preferred: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, and `chore:`.
Scopes are encouraged where useful, for example:

```text
feat(provider): add local provider
feat(ui): add library page
fix(restore): preserve timestamps
```

Commit linting is intentionally not enforced at this stage.

## Pull requests

- Prefer focused pull requests with a clear motivation.
- Discuss major architecture, schema, or provider API changes before implementation.
- Follow the boundaries in [docs/architecture.md](docs/architecture.md).
- Update documentation when behavior or contributor workflows change.
- Use Conventional Commits where practical, such as `feat(ui): add library navigation`.
- Include screenshots only for genuine UI changes; do not create fake product screenshots.
- Rebase or merge current `main` into the branch before final review when needed.

## Game definitions

Read [docs/game-definitions.md](docs/game-definitions.md). A definition PR should identify the
game, launcher, OS, verified paths, and whether saves contain slots, worlds, profiles, or
characters. Keep support data-only and do not include executable code.

## Storage providers

Read [docs/providers.md](docs/providers.md) first. Open an issue before a new provider so its API,
authentication, capabilities, security, and platform support can be discussed. Provider code must
not include game knowledge or backup policy, and no secrets may be committed.
