import axios from 'axios';
import { query } from '../db/client';

const getJiraClient = () => {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL;

  if (!email || !token || !baseUrl) return null;

  return axios.create({
    baseURL: `${baseUrl}/rest/api/3`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      Accept: 'application/json',
    },
  });
};

const fetchJiraTitle = async (key: string): Promise<string | null> => {
  try {
    const client = getJiraClient();
    if (!client) return null;

    const response = await client.get(`/issue/${key}`, { params: { fields: 'summary' } });
    return response.data.fields.summary;
  } catch (err: any) {
    console.error(`Could not fetch JIRA title for ${key}:`, err.response?.status || err.message);
    return null;
  }
};

export const ensureJiraTitles = async (keys: string[]): Promise<{ [key: string]: string }> => {
  if (keys.length === 0) return {};

  const cached = await query(
    'SELECT jira_key, title FROM jira_tickets WHERE jira_key = ANY($1::text[])',
    [keys]
  );
  const titles: { [key: string]: string } = Object.fromEntries(
    cached.rows.map((r: any) => [r.jira_key, r.title])
  );

  for (const key of keys) {
    if (titles[key]) continue;

    const title = await fetchJiraTitle(key);
    if (title) {
      await query(
        `INSERT INTO jira_tickets (jira_key, title) VALUES ($1, $2)
         ON CONFLICT (jira_key) DO UPDATE SET title = EXCLUDED.title, fetched_at = CURRENT_TIMESTAMP`,
        [key, title]
      );
      titles[key] = title;
    }
  }

  return titles;
};
