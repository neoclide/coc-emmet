# Upstream investigation — 2026-10-03

Status: blocked before source porting. No source, manifest, lockfile or toolchain changes were made. The user-facing completion-only scope and all Coc adaptations remain untouched.

## Verified provenance and boundary

- Downstream checkout: `19cb463` (coc-emmet 1.1.6); isolated branch `codex/upstream-sync-20261003`.
- README explicitly identifies this as a fork of VS Code's Emmet extension with completion support only.
- Original source import: `276586505b7b173d2a6bf630c48747a03cf3a151`, 2018-12-09, message `works`. It adds provider, parsing utilities, abbreviation validation, buffer stream and types, but no upstream commit/ref is recorded.
- Source history after import contains Coc-specific edits (document line access, CSS parsing, provider registration, priority, deferred textEdit resolution, completion list flags). No subsequent upstream synchronization commit/ref was found in commit messages or repository documentation.
- Requested current target is verified local VS Code `67cb2a17e24d903be7d50486a70d9bd835e95ad6`. Its local history is shallow; the 2024 shallow boundary must not be mistaken for Emmet's original file creation or the downstream synchronization baseline.

Read-only GitHub file-history investigation, bounded to the original import date:

- `extensions/emmet/src/defaultCompletionProvider.ts` last changed at `6ad61f018ab84d1982dd9dacdb6e7eefb1de8d33` (2018-10-03). Its source has clear shared structure with the original Coc import, but also host and behavior differences; it is a single-file provenance candidate, not an established whole-extension baseline.
- `extensions/emmet/src/util.ts` last changed at `dcc243c9920f0077e87e4a7befbc67c713a1709b` (2018-11-19), preceded by `6ad61f0` and `067ed91`. This confirms that the provider's last change cannot simply be used as the complete extension baseline.
- No full repository unshallow or guessed release baseline was used. The original import's exact upstream snapshot remains unverified. A safe full change ledger to the 2026 target therefore has not been established.

## Baseline validation

- Frozen Yarn dependency install was completed by the coordinator without lifecycle scripts.
- Node 24.21.0 default `yarn build` fails with webpack 4 MD4/OpenSSL `ERR_OSSL_EVP_UNSUPPORTED`.
- One-command `NODE_OPTIONS=--openssl-legacy-provider yarn build` passes with webpack 4.34.0. No persistent environment or build configuration was changed.
- Independent TypeScript 3.4.5 `tsc --noEmit` fails on existing coc.nvim declaration compatibility: ambient accessor TS1086 errors and missing `Omit` TS2304 (22 diagnostics). No port has been made, so these are baseline errors.
- No existing automated editor/regression suite is declared. No new test coverage or Vim/Neovim compatibility is claimed.
- Git diff --check and Coc contract inventory comparison pass; source and public contract are unchanged.

## Follow-up needed

Recover an authoritative upstream baseline from the original import context, or explicitly scope a new per-feature re-port against the verified target rather than claiming an uninterrupted synchronization range. The existing TypeScript/Coc declaration compatibility failure also needs a separately verified resolution before a larger port can be assessed reliably. Preserve Coc's completion-only scope and deferred textEdit/priority behavior during any future work.

Only this investigation record and task-specific AGENTS.md were added. This is documentation-only work; source synchronization remains blocked. No package publication or default-branch merge is authorized. See Git history and the task report for documentation delivery status.
