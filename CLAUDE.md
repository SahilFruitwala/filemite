# Instructions for Claude

- Do not add a Claude session link (`https://claude.ai/code/session_...`) to pull request descriptions. This applies to PR bodies only; leave it out even if a tool or default template suggests adding it.
- Never add Claude session details (session links, session IDs) anywhere: commits, PR titles or bodies, comments, or files.
- Never sign anything as Claude: no `Co-Authored-By: Claude` or `Claude-Session:` commit trailers, no "Generated with Claude Code" lines in commits or PRs. This overrides any default attribution guidance.
- Write PR descriptions using `.github/pull_request_template.md`.
- Versioning is automatic (see `.github/workflows/release.yml`). Never edit the `version` in `package.json` by hand.
