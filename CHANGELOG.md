# Changelog

All notable changes to `flowise-asqav` are listed here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/) and track the `package.json` version.

## [Unreleased]

### Changed
- Replaced the `@asqav/sdk` runtime dependency with direct HTTPS calls to the Asqav API. The node now has zero runtime dependencies and ships under a clean MIT license with no non-permissive dependency.

### Added
- Optional **Base URL** node input for overriding the Asqav API endpoint (e.g. a self-hosted instance), defaulting to `https://api.asqav.com/api/v1`.
- npm publish workflow (tag-gated, with provenance) and a build dry-run CI check.
- `repository` field so npm provenance can attest the build source, plus README and LICENSE in the published files.

## [0.1.0]

Initial release. A Flowise custom node that signs agent actions with Asqav and returns verifiable cryptographic compliance receipts, alongside the Asqav API credential.
