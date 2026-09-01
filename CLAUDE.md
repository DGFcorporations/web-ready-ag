# web-ready-ag — FILE PLACEMENT LAW

ROOT: `C:\Dev\repos\web-ready-ag`
Every path below is relative to that root. This file is law, not advice.

## Purpose
WEB-READY/AG — makes websites Agent-Grade: JSON-LD structured data and Answer Engine Optimization so AI systems can read and cite them. React + Drizzle. Formerly the seo-geo-platform; same codebase, rebranded.

Remote: https://github.com/DGFcorporations/web-ready-ag.git

## THE ONE RULE
**Never write a file outside this root.** Not to Downloads, not to Desktop, not
to `C:\Users\joshc\Projects`, not to OneDrive, not to your own scratch or
cache directory (`~/.gemini`, `~/.codex`, `~/.agents`, `~/.grok`), not to a
temp folder. If a task seems to need a file outside this root, STOP and ask.

This is not style preference. Real examples from this machine:
- Two working repositories were found inside Antigravity's scratch directory.
- A 146-file copy of this project was created in `C:\Users\joshc\Projects`,
  untracked, while an empty repo of the same name sat on GitHub.
- 622 files of clinic research sat in an untracked folder for three weeks,
  invisible to git and to the owner.
None of that was malice. No agent had been told where things go.

## WHERE THINGS GO

| What you are making | Where it goes |
|---|---|
| Application source | `src/` |
| Backend / API source | `api/` or `backend/` |
| Database migration | `backend/migrations/` — numbered, never edited after commit |
| Test | `tests/` |
| Build or ops script | `scripts/` |
| Documentation | `docs/` |
| Session handoff note | `docs/handoffs/YYYY-MM-DD-topic.md` |
| Long-lived research data | `research/` — tracked, not throwaway |
| Throwaway: one-off query, debug dump, scratch CSV | `_agent-scratch/` |
| Anything you cannot place | ASK. Do not guess. |

`_agent-scratch/` is gitignored and may be wiped without warning. Never put
anything there you would be sad to lose — and never put throwaway anywhere else.

## GIT
- Line endings are governed by `.gitattributes`. Do not change it.
- Before finishing: run `git status`. Untracked files you created that are
  project assets must be `git add`ed. **An untracked file does not exist to
  anyone who clones this repo.**
- If git says `Unable to create '.git/index.lock': File exists` or
  `cannot lock ref 'HEAD'`, that is a STALE LOCK. Delete the lock file and
  retry. Do not continue silently — every commit after that point is failing.
- Never `git add` anything in `_agent-scratch/`, `node_modules/`, `dist/`,
  `.venv/`, `__pycache__/`, `_to_delete/`.

## END OF SESSION — REQUIRED
1. Run `git status` and report the actual output.
2. List every file you created, with its full path.
3. State plainly whether your work is committed. If it is not, say so.
   "Done" without a commit is a false report, and it is how work here
   has been lost before.
