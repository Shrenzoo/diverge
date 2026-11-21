# Security and privacy

## Reporting

Use the repository's **Security → Report a vulnerability** entry once private vulnerability reporting is enabled. If it is unavailable, ask a maintainer for a private contact in a public issue without including sensitive details. Do not attach secrets, proprietary repositories, personal paths, or raw agent traces to public issues.

## Installation boundary

The installer and uninstaller use Node's filesystem APIs. They launch no subprocesses, contact no network services, run no package lifecycle scripts, change no permissions on existing files, and never edit agent instructions, shell profiles, project preferences, or login settings.

Project scope anchors at the current directory or the existing directory passed to `--project-dir`. User scope anchors at the operating system home directory. For Codex, metadata is under `.agents`; for Claude Code, under `.claude`. Under each selected metadata directory the installer can create:

| Path | Purpose |
