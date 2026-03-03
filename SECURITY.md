# Security Policy

## Supported Versions

This project is actively maintained on `main`.

## Reporting a Vulnerability

Please do not open a public issue for sensitive vulnerabilities.

Preferred channels:

- Private message to the maintainer
- Private repository discussion if available

When reporting, include:

- Description of the issue
- Reproduction steps
- Impact assessment
- Suggested mitigation (if any)

## Secret Management

- Never commit real credentials in the repository.
- Use `.env.local` for local secrets.
- Keep `.env.example` as template only.
- Rotate any credential immediately if exposure is suspected.
