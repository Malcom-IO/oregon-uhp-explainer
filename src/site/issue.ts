/**
 * The project's "open an issue" link. It opens the issue form in .github/ISSUE_TEMPLATE/issue.yml,
 * which says that the Board does not see these issues. Every issues link in the page, README and
 * docs uses this address (the README may also link PLANNED_ISSUES_URL), and
 * src/site/issue.spec.ts holds them to it.
 */
export const NEW_ISSUE_URL = 'https://github.com/Malcom-IO/oregon-uhp-explainer/issues/new?template=issue.yml';

/** The open issues labeled `planned`: the project's own planned work, linked from the README. */
export const PLANNED_ISSUES_URL =
  'https://github.com/Malcom-IO/oregon-uhp-explainer/issues?q=is%3Aissue%20state%3Aopen%20label%3Aplanned';
