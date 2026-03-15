# Release Checklist

Use this checklist before creating a public prerelease tag/release.

## Preflight

- [ ] Working tree is clean
- [ ] Release branch/PR scope is approved
- [ ] No secrets or private assets in diff

## Validation

- [ ] `pnpm -r lint` passes
- [ ] `pnpm -r typecheck` passes
- [ ] `pnpm -r test` passes
- [ ] `pnpm -r build` passes
- [ ] `go test ./...` passes for edge-agent if Go scope changed

## Docs and Notes

- [ ] `README.md` (KO, primary) and `README.en.md` (EN mirror) are aligned for setup/architecture
- [ ] `CHANGELOG.md` includes release entry
- [ ] `docs/releases/<version>.md` draft notes are ready
- [ ] Screenshot assets are present under `docs/screenshots/` or fallback guide is updated

## Packaging/Release Actions (outside this prep run)

- [ ] Create annotated tag (example: `v0.1.0-alpha.0`)
- [ ] Create GitHub prerelease with release notes
- [ ] Attach checksums/artifacts if distributed
- [ ] Announce release channels (README/discussions)

## Post-release

- [ ] Confirm install docs still work from tagged revision
- [ ] Track known issues and feedback in Issues/Discussions
