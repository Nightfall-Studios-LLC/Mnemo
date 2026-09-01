# GitHub repository setup

This checklist contains GitHub-side configuration that cannot be represented completely by files
in the repository. It targets `Nightfall-Studios-LLC/Mnemo`.

## About

Open the repository page, select the gear beside **About**, and configure:

- Description: `Open-source game save manager with versioned backups and pluggable cloud, local, and network storage providers.`
- Website: leave empty until an official project site exists.
- Topics: `game-saves`, `backup`, `save-manager`, `cloud-storage`, `gaming`, `open-source`,
  `game-backup`, `qt`, `cpp`, `cmake`

## Features

Open **Settings → General → Features**:

- Issues: enabled
- Discussions: enabled
- Wikis: disabled unless the project explicitly needs one later

After enabling Discussions, create or retain these categories under **Discussions → Categories**:

- Ideas
- Q&A
- Provider Development
- Game Definitions
- Show and Tell
- General

## Pull Requests

Open **Settings → General → Pull Requests**:

- Allow merge commits: off
- Allow squash merging: on
- Allow rebase merging: off
- Automatically delete head branches: on

Use the pull request's title as the default squash commit message where GitHub offers that choice.

## `main` branch ruleset

Open **Settings → Rules → Rulesets → New ruleset → New branch ruleset**:

- Ruleset name: `Protect main`
- Enforcement status: active
- Target branches: include default branch, or branch name pattern `main`
- Restrict deletions: enabled
- Block force pushes: enabled
- Require a pull request before merging: enabled
- Required approvals: `0` while there is only one maintainer
- Require conversation resolution before merging: enabled

Do not require an external approval while there is only one maintainer. Once another trusted
maintainer exists, change required approvals to `1`.

The Windows CI workflow exists, but do not require status checks until it has run reliably on the
hosted repository. Once reliable, enable **Require status checks to pass** and select the actual
check names GitHub reports for the build and tests. Also enable **Require branches to be up to date
before merging** at that time. Do not guess check names before the first successful workflow run.

## Security

Open **Settings → Security → Code security and analysis** and enable where the organization plan
supports them:

- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection

Open **Settings → Security → Private vulnerability reporting** and enable private reporting.

## Permissions

Open **Settings → Collaborators and teams**:

- Repository owner: Admin
- Trusted maintainers added later: Maintain or Write, according to responsibility
- Normal contributors: fork the repository and open pull requests

Do not give unknown or occasional contributors direct write access.

## Labels

Open **Issues → Labels** and create any missing entries below. Reuse equivalent existing labels and
avoid duplicates. No labels have been claimed as created until they are verified through GitHub.

- `type: bug`
- `type: feature`
- `type: refactor`
- `type: documentation`
- `area: ui`
- `area: core`
- `area: providers`
- `area: detection`
- `area: backup`
- `area: restore`
- `area: sync`
- `status: needs-triage`
- `status: blocked`
- `status: needs-info`
- `good first issue`
- `help wanted`
- `breaking change`

## Repository setup pull request

After `chore/repository-setup` is pushed, open:

`https://github.com/Nightfall-Studios-LLC/Mnemo/compare/main...chore/repository-setup?expand=1`

Use the title `chore: set up repository workflow`, review the generated checklist, and open the
pull request into `main`. Do not merge until CI completes successfully.
