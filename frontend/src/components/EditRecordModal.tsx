import { useState } from 'react';
import { Record } from '../hooks/useRecords';

interface EditRecordModalProps {
  record: Record | null;
  onClose: () => void;
  onSubmit: (data: { pr_url: string; jira_keys?: string; description?: string }) => Promise<void>;
  isLoading?: boolean;
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({ record, onClose, onSubmit, isLoading = false }) => {
  if (!record) return null;
  return <EditForm key={record.id} record={record} onClose={onClose} onSubmit={onSubmit} isLoading={isLoading} />;
};

const EditForm: React.FC<Omit<EditRecordModalProps, 'record'> & { record: Record }> = ({
  record,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [prUrl, setPrUrl] = useState(record.pr_url);
  const [jiraKeys, setJiraKeys] = useState(record.jira_keys || '');
  const [description, setDescription] = useState(record.description || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prUrl.trim()) {
      setError('Please enter the related PR URL');
      return;
    }

    try {
      await onSubmit({
        pr_url: prUrl.trim(),
        jira_keys: jiraKeys.trim() || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update record');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Edit Record</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GitHub PR URL *</label>
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">JIRA Ticket(s)</label>
            <input
              type="text"
              value={jiraKeys}
              onChange={(e) => setJiraKeys(e.target.value)}
              placeholder="Paste the full Jira URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
