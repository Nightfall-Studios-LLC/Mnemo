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

## GitHub repository administration

The exact repository settings and labels maintainers should configure are documented in
[github-setup.md](github-setup.md). These settings are intentionally separate from the local
developer workflow because most require repository administrator access.

