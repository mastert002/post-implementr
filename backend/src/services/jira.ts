import axios from 'axios';
import * as base64 from 'base-64';

interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  url: string;
}

const getJiraClient = () => {
  const token = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL;

  if (!baseUrl) {
    console.warn('JIRA_BASE_URL not set, JIRA validation disabled');
    return null;
  }

  const auth = token
    ? `Basic ${base64.encode(`${token}:${token}`)}`
    : undefined;

  return axios.create({
    baseURL: `${baseUrl}/rest/api/3`,
    headers: auth ? { Authorization: auth } : {},
  });
};

export const validateJiraKey = async (key: string): Promise<JiraTicket | null> => {
  try {
    const client = getJiraClient();
    if (!client) return null;

    const response = await client.get(`/issue/${key}`);

    return {
      key: response.data.key,
      summary: response.data.fields.summary,
      status: response.data.fields.status?.name || 'Unknown',
      url: `${process.env.JIRA_BASE_URL}/browse/${response.data.key}`,
    };
  } catch (err) {
    console.error(`Error validating JIRA key ${key}:`, err);
    return null;
  }
};

export const validateJiraKeys = async (keys: string[]): Promise<{ [key: string]: JiraTicket | null }> => {
  const results: { [key: string]: JiraTicket | null } = {};

  for (const key of keys) {
    results[key] = await validateJiraKey(key);
  }

  return results;
};

export const isValidJiraKeyFormat = (key: string): boolean => {
  // Simple JIRA key format validation: PROJECT-123
  return /^[A-Z][A-Z0-9]*-\d+$/.test(key);
};
