# Sprint 1 Deviations (19 - 23 Oct 2026)

Group 2 - Online Bookstore. All 17 Sprint 1 backlog items (64 story points) are Done on the project board.

## Deviations from the submitted documents and process

1. **Verification-only items.** FR-01, FR-02, FR-03, FR-06, NFR-03 (Koushik) and FR-07, FR-08, FR-09, FR-10 (Deeptha) were already implemented in the starter code. Their pull requests add test evidence (docs/sprints/evidence/) from the automated tests, not new code.
2. **Test database.** Tests run against a MongoDB Atlas free cluster (MONGO_URI_TEST) instead of a local or in-memory MongoDB, because the in-memory MongoDB download timed out. The Test Plan expected a real MongoDB, so test coverage is unchanged.
3. **Bug found and fixed.** The Book text index failed on books whose language field held values like Hindi or Tamil. The index options were changed (default_language none, language_override text_language). No requirement changed.
4. **Pull request template.** Some pull requests did not use the full template, or left the issue number after "Closes #" blank. Those issues were closed and moved to Done manually on the board.
5. **Assignees.** The assignees on FR-14 (#14) and FR-15 (#15) were updated after the work was merged, so both show more than one assignee.
6. **Direct pushes to main.** Documentation files (Test Plan update, the demo video) were pushed directly to main without a pull request. Code changes went through pull requests with review.
7. **Copilot review.** The automatic Copilot review failed with a quota message on several pull requests. It had no effect on merging; reviews were done by team members.
8. **Demo video.** The Sprint 1 demo video is about 2 minutes instead of the requested 1 minute.

## Carry-over to Sprint 2

No Sprint 1 items were moved to Sprint 2. Sprint 2 (26 - 30 Oct) covers the remaining backlog items.

## Actions for Sprint 2

- Use the full pull request template and write the issue number after "Closes #".
- Keep the demo video within the requested length.
