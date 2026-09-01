# Development guide

## Windows prerequisites

- Windows 10 or newer
- Git and VS Code (optional)
- CMake 3.24 or newer
- C++20 compiler
- Qt 6.5 or newer with Widgets and Qt Test

The currently validated setup uses MSYS2 UCRT64. Install MSYS2, then run in its shell:

```bash
pacman -Syu
pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-gdb \
  mingw-w64-ucrt-x86_64-qt6-base mingw-w64-ucrt-x86_64-cmake \
  mingw-w64-ucrt-x86_64-ninja
```

Set `MNEMO_MSYS2_ROOT` to the MSYS2 root (normally `C:\msys64`). The included PowerShell helper
auto-detects common locations if it is not set:

```powershell
./scripts/dev.ps1 build debug
./scripts/dev.ps1 test debug
./scripts/dev.ps1 run debug
```

Direct CMake commands are:

```powershell
cmake --preset debug
cmake --build --preset debug
ctest --preset debug
```

Use the `release` preset for an optimized build.

## VS Code

Open the repository and install the recommended extensions. Available tasks include Debug
configure/build/test/run and Release build-and-test. `Ctrl+Shift+B` builds Debug; `F5` builds and
starts a GDB session. CMake Tools also discovers the checked-in presets.

If VS Code was open when `MNEMO_MSYS2_ROOT` was first created, restart it so the debugger sees the
new environment variable.

## Testing and style

CTest discovers test executables. Keep business logic in `MnemoCore` or future focused libraries
so it can be tested without a GUI. Use RAII, const correctness, clear ownership, and Qt parent
ownership for widgets. Do not add `-Werror` globally. Format C++ with the checked-in
`.clang-format` and follow `.editorconfig` for other files.

Prefer Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, and `chore:`. Scopes
are encouraged, for example `feat(provider): add local provider` or
`fix(restore): preserve timestamps`.

## Recommended GitHub Repository Settings

Main branch ruleset:

- Require pull requests before merge.
- Block force pushes and branch deletion.
- Require conversation resolution.
- Require passing CI once it is stable.
- Do not require external approval while there is only one maintainer.

Merge settings:

- Enable squash merging and automatic deletion of merged branches.
- Consider disabling merge commits.

Security settings:

- Enable Dependabot alerts and security updates.
- Enable secret scanning, push protection, and private vulnerability reporting.

Suggested Discussions categories are Ideas, Q&A, Provider Development, Game Definitions, Show and
Tell, and General.

Suggested labels are `type: bug`, `type: feature`, `type: refactor`, `type: documentation`,
`area: ui`, `area: core`, `area: providers`, `area: detection`, `area: backup`, `area: restore`,
`area: sync`, `status: needs-triage`, `status: blocked`, `status: needs-info`, `good first issue`,
`help wanted`, and `breaking change`.

Recommended description: "Open-source game save manager with versioned backups and pluggable
cloud, local, and network storage providers."

Recommended topics: `game-saves`, `backup`, `save-manager`, `cloud-storage`, `gaming`,
`open-source`, `game-backup`, `qt`, `cpp`, and `cmake`.

