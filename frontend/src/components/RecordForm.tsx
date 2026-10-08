import { useState } from 'react';

interface RecordFormProps {
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export const RecordForm: React.FC<RecordFormProps> = ({ onSubmit, isLoading = false }) => {
  const [prUrl, setPrUrl] = useState('');
  const [jiraKeys, setJiraKeys] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prUrl) {
      setError('Please enter the related PR URL above');
      return;
    }

    try {
      await onSubmit({
        pr_url: prUrl,
        jira_keys: jiraKeys || undefined,
        description: description || undefined,
      });

      setPrUrl('');
      setJiraKeys('');
      setDescription('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create record');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Add Implementation Record</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub PR URL *
          </label>
          <input
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Paste the full GitHub PR URL</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JIRA Ticket(s)
          </label>
          <input
            type="text"
            value={jiraKeys}
            onChange={(e) => setJiraKeys(e.target.value)}
            placeholder="PROJ-123, PROJ-456"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste the full Jira URL
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any implementation notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {isLoading ? 'Creating...' : 'Add Record'}
        </button>
      </div>
    </form>
  );
};
