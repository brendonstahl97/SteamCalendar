# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub issue with exploit details or paste secrets, tokens, or `.env` contents.

Instead, open a GitHub Security Advisory (preferred) or contact the repository maintainer privately with:

- A description of the issue
- Steps to reproduce
- Impact assessment

## Secrets and configuration

- Never commit `.env`, API keys, OAuth client secrets, or `SESSION_SECRET` values.
- Use `.env.example` as a template only.
- Rotate credentials immediately if they are exposed.

## Supported versions

Security fixes are applied on the `main` branch. Deploy the latest `main` commit for production.
