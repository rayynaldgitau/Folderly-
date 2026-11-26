# Contributing to Foldy

Thank you for your interest in contributing to Foldy!

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri v2 system prerequisites](https://v2.tauri.app/start/prerequisites/)

## Local Setup

```bash
git clone https://github.com/rayynaldgitau/Folderly-.git
cd Folderly-
npm install
npm run tauri dev
```

## Making Changes

1. Fork the repository and create a branch from `main` (`feat/your-feature` or `fix/your-fix`).
2. Keep changes focused and preserve existing safety guards (protected OS paths, CSP, safe `ShellExecuteW`).
3. Add or update tests in `src-tauri` when changing Rust backend behavior.
4. Run all checks before opening a pull request:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

5. Open a pull request against `main` describing what changed and how you verified it.
