import axios from 'axios';

const GITHUB_API_BASE = 'https://api.github.com';

interface PRDetails {
  id: number;
  number: number;
  title: string;
  body: string;
  url: string;
  created_at: string;
  merged_at: string | null;
}

const getGithubClient = () => {
  const token = process.env.GITHUB_API_TOKEN;
  return axios.create({
    baseURL: GITHUB_API_BASE,
    headers: token ? { Authorization: `token ${token}` } : {},
  });
};

export const extractOwnerAndRepo = (
  prUrl: string
): { owner: string; repo: string; number: string } | null => {
  const regex = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
  const match = prUrl.match(regex);

  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    number: match[3],
  };
};

export const fetchPRDetails = async (prUrl: string): Promise<PRDetails | null> => {
  try {
    const parts = extractOwnerAndRepo(prUrl);
    if (!parts) return null;

    const client = getGithubClient();
    const response = await client.get(
      `/repos/${parts.owner}/${parts.repo}/pulls/${parts.number}`
    );

    return {
      id: response.data.id,
      number: response.data.number,
      title: response.data.title,
      body: response.data.body || '',
      url: response.data.html_url,
      created_at: response.data.created_at,
      merged_at: response.data.merged_at,
    };
  } catch (err) {
    console.error('Error fetching PR details:', err);
    return null;
  }
};

export const detectJiraKeys = (text: string): string[] => {
  // Match JIRA key format: PROJECT-123
  const jiraRegex = /([A-Z][A-Z0-9]*-\d+)/g;
  const matches = text.match(jiraRegex) || [];

  // Remove duplicates
  return [...new Set(matches)];
};

export const extractJiraKeysFromPR = async (prUrl: string): Promise<string[]> => {
  const prDetails = await fetchPRDetails(prUrl);
  if (!prDetails) return [];

  const titleKeys = detectJiraKeys(prDetails.title);
  const bodyKeys = detectJiraKeys(prDetails.body);

  const allKeys = [...titleKeys, ...bodyKeys];
  return [...new Set(allKeys)]; // Remove duplicates
};
