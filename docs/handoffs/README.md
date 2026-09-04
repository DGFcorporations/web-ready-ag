# In-repo handoffs — for agents that cannot reach C:\Dev

Local agents (Antigravity, Claude Code, Qwen Code, Devin) use the machine-wide log
at `C:\Dev\agents\shared\`. Cloud agents (Jules, and anything else that clones this
repo into its own VM) cannot see that path — it is not in the repository.

So: if you cannot open `C:\Dev\agents\shared\WORKLOG.md`, you are a cloud agent.
Write your handoff HERE instead, named `YYYY-MM-DD-<agent>-<topic>.md`, and commit
it with your work. It travels with the PR and the human syncs it to the shared log.

Same required content either way:
    # <title>
    Agent / Date / Branch / Commit (or NOT COMMITTED)
    ## What I did
    ## Files I created or changed (full paths)
    ## What is NOT done
    ## What the next agent should know
