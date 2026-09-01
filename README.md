# Mnemo

Mnemo is an open-source desktop game-save manager designed to back up, restore, version,
and synchronize game saves across local, network, and cloud storage providers.

> [!WARNING]
> Mnemo is pre-alpha. The application is an architectural foundation and is not ready to
> protect real save data.

## Why Mnemo?

Game saves are scattered across launchers, directories, machines, and cloud systems. Mnemo
aims to offer one transparent, provider-independent place to manage them while keeping game
support community-editable.

## Current status

The repository contains a buildable C++20/Qt 6 application shell, an experimental storage
provider interface, architecture documentation, CTest support, and contributor tooling.
Backup, restore, detection, and provider functionality are intentionally not implemented yet.

## Planned features

- Installed-game and save-location discovery
- Versioned backup history and safe restore
- Save group, profile, character, world, and slot selection
- Local, external, network, and cloud storage
- Multi-PC synchronization and conflict detection
- Community-maintained game definitions and providers

| Provider | Status |
| --- | --- |
| Local | Planned |
| External Drive | Planned |
| NAS / SMB | Planned |
| Google Drive | Planned |
| MEGA | Planned |

## Build on Windows

Install MSYS2 and its UCRT64 GCC, Qt 6, CMake, Ninja, and GDB packages as described in
[the development guide](docs/development.md). Then run:

```powershell
$env:MNEMO_MSYS2_ROOT = "C:\msys64"
cmake --preset debug
cmake --build --preset debug
ctest --preset debug
./build/debug/bin/Mnemo.exe
```

VS Code users can install the recommended extensions and run **Mnemo: Build (Debug)** with
`Ctrl+Shift+B`, **Mnemo: Test (Debug)** from Test Tasks, or **Debug Mnemo** with `F5`.

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then read the
[architecture](docs/architecture.md) before changing core boundaries. Focused game-definition
and provider contributions are part of the long-term design.

## License

Mnemo is licensed under the [GNU General Public License v3.0](LICENSE).

