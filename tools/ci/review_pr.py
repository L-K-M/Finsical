#!/usr/bin/env python3
"""Post an automated code review on a PR using GLM via the z.ai coding-plan API.

Reads the unified diff from a file, asks GLM-5.3 for a structured review, and
posts it as a PR review comment. Stdlib only.
"""
import json
import os
import sys
import urllib.request

ZAI_URL = "https://api.z.ai/api/coding/paas/v4/chat/completions"
MODEL = "glm-5.3"
MAX_DIFF = 120_000  # chars

SYSTEM = """\
You are a concise, strict code reviewer for the Finsical project (a retro
virtual aquarium). Review the PR diff below.

Rules:
- Only flag real problems: bugs, broken logic, security issues, incorrect
  format handling, missing error handling at real boundaries, or violations
  of the stated conventions in the diff context.
- Do NOT comment on style nits, naming taste, missing docs, or hypothetical
  features. Prefer silence over noise.
- Every finding: `path:line` — one line describing the problem and the fix.
- Classify each finding as BLOCKING (must fix before merge) or NIT.

Respond in this exact format:

## Verdict
APPROVE  (or REQUEST CHANGES if any BLOCKING findings)

## Findings
- [BLOCKING] file:line — problem — fix
- [NIT] file:line — problem — fix

(or "## Findings\n(none)" if clean)
"""


def post_zai(diff: str) -> str:
    key = os.environ["ZAI_API_KEY"]
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": "PR diff:\n\n```diff\n" + diff + "\n```"},
        ],
        "max_tokens": 4096,
        "temperature": 0.2,
    }).encode()
    req = urllib.request.Request(
        ZAI_URL, data=body,
        headers={"Authorization": f"Bearer {key}",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.load(r)
    return resp["choices"][0]["message"]["content"]


def post_review(body: str) -> None:
    token = os.environ["GITHUB_TOKEN"]
    repo = os.environ["GITHUB_REPOSITORY"]
    pr = os.environ["PR_NUMBER"]
    url = f"https://api.github.com/repos/{repo}/issues/{pr}/comments"
    payload = json.dumps({"body": body}).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={"Authorization": f"Bearer {token}",
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json"},
        method="POST")
    urllib.request.urlopen(req, timeout=30).read()


def main() -> int:
    diff_path = sys.argv[1]
    diff = open(diff_path, encoding="utf-8", errors="replace").read()
    if not diff.strip():
        post_review("🤖 **GLM-5.3 review**\n\nEmpty diff — nothing to review.")
        return 0
    truncated = len(diff) > MAX_DIFF
    if truncated:
        diff = diff[:MAX_DIFF] + "\n\n[... diff truncated for review ...]"
    try:
        review = post_zai(diff)
    except Exception as e:  # never block CI on reviewer outage
        post_review(f"🤖 **GLM-5.3 review** failed: `{e}`")
        return 0
    header = "🤖 **GLM-5.3 automated review**"
    if truncated:
        header += " _(diff truncated)_"
    post_review(f"{header}\n\n{review}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
