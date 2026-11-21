# Security and privacy

## Reporting

Use the repository's **Security → Report a vulnerability** entry once private vulnerability reporting is enabled. If it is unavailable, ask a maintainer for a private contact in a public issue without including sensitive details. Do not attach secrets, proprietary repositories, personal paths, or raw agent traces to public issues.

## Installation boundary

The installer and uninstaller use Node's filesystem APIs. They launch no subprocesses, contact no network services, run no package lifecycle scripts, change no permissions on existing files, and never edit agent instructions, shell profiles, project preferences, or login settings.

Project scope anchors at the current directory or the existing directory passed to `--project-dir`. User scope anchors at the operating system home directory. For Codex, metadata is under `.agents`; for Claude Code, under `.claude`. Under each selected metadata directory the installer can create:

| Path | Purpose |
| --- | --- |
| `skills/diverge/` | Complete skill copy plus a `.diverge-install.json` receipt containing package file names and SHA-256 digests. |
| `.diverge-lock/` | Exclusive directory shared by install and uninstall. Removed after normal completion. |
| `.diverge-stage-*` | Private staging directory for an incoming copy. Installation publishes it with a rename. |
| `.diverge-backup-*` | The complete previous directory, retained after an explicitly authorized replacement. |

The tool validates real parent directories and refuses symbolic links in a source or replacement tree. Uninstall checks safe parents, receipt names, and file hashes and leaves local edits, links, and extra content in place. An identical reinstall does nothing. An installation without a receipt is unmanaged. Dry runs perform validation and inspection without filesystem changes.

Each host is locked in a fixed order. Both destinations are preflighted before either skill is installed. Each activation of a staged directory is atomic on its filesystem. A disk or process failure between hosts can leave one updated. Rerun after inspecting the reported paths. If a process dies during replacement, the printed backup holds the previous tree. With all installers stopped, inspect the stage, destination and backup, restore the desired tree by renaming it into the empty destination, then remove the empty stale lock. Backups can contain local edits and remain under the owner's control. Use a trusted local account and avoid concurrent edits by other tools during installation.

## Runtime boundary

Skill instructions run in the host's normal permission model. The package has no telemetry or analytics. Its local tools never send source to a service. Using a hosted coding agent remains subject to that provider's normal data handling. The optional live evaluator invokes the selected provider CLI with synthetic fixtures and a dedicated API key. Provider charges and network traffic can result. The runner passes no shell command supplied by a case and does not execute generated application code to grade it.

