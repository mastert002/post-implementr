export const JIRA_BASE_URL = 'https://africaprudential.atlassian.net';

export const jiraUrl = (key: string) => `${JIRA_BASE_URL}/browse/${key}`;

export const jiraLabel = (key: string, titles?: { [key: string]: string }) =>
  titles?.[key] ? `${key} - ${titles[key]}` : key;
