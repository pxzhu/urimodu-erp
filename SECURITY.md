# Security Policy

## Supported Versions

Security fixes are applied to the default branch first.

| Branch | Supported |
| --- | --- |
| `main` | Yes |
| Others | Best effort |

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Use GitHub private vulnerability reporting:

1. Open this repository's **Security** tab.
2. Go to **Advisories**.
3. Click **Report a vulnerability**.

If private reporting is not available yet, contact the repository maintainers privately.

Please include:

- Clear description of the issue
- Affected component(s) and version/commit
- Reproduction steps or proof of concept
- Potential impact and suggested remediation (if known)

## Disclosure Process

- We will acknowledge a valid report as soon as possible.
- We will investigate, reproduce, and classify severity.
- We will prepare a fix and publish a coordinated advisory when ready.

## Secrets and Sensitive Data

- Never commit credentials, private keys, tokens, or customer data.
- Use `.env` files locally and secret references in deployment manifests.
- Keep vendor-private SDKs and proprietary binaries out of this repository.
