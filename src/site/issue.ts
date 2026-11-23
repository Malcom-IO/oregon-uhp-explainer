/**
 * The project's "open an issue" link. It opens GitHub's plain new-issue page with this text in
 * the description. The note sits in an HTML comment: it shows while someone writes and drops
 * out of the posted issue. Every issues link in the page, README and docs uses this address,
 * and src/site/issue.spec.ts holds them to it.
 */
export const ISSUE_BODY = `<!--
This project explains what the Universal Health Plan Governance Board's documents say. It
takes no position on the plan, it is not run by the Board, and the Board does not see these
issues. To tell the Board what it should decide, use its public comment process:
https://www.oregon.gov/uhpgb/Pages/public-comment.aspx

Issues here are for making the site accurate and clear: a wrong number, a missing source, or
a sentence that misreads a document. Fill in what you can; it's fine to leave a line blank.
Each section of the explainer has its own address you can paste below, such as
https://malcom-io.github.io/oregon-uhp-explainer/#coverage
Please use made-up household figures, not your own.
-->

**Where on the site:**

**What it says now:**

**What it should say, and why:**

**Source (document, page and table), if you have one:**
`;

// Parentheses and apostrophes are encoded too: left bare, a ")" would end a Markdown link.
export const NEW_ISSUE_URL =
  'https://github.com/Malcom-IO/oregon-uhp-explainer/issues/new?body=' +
  encodeURIComponent(ISSUE_BODY).replace(/[()']/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
