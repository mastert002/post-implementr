export const JIRA_BASE_URL = 'https://africaprudential.atlassian.net';

export const jiraUrl = (key: string) => `${JIRA_BASE_URL}/browse/${key}`;
