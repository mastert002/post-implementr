import { useState } from 'react';

interface RevertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
  isLoading?: boolean;
}

export const RevertModal: React.FC<RevertModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!comment.trim()) {
      setError('Please enter a comment explaining why this record is set to pending');
      return;
    }

    try {
      await onSubmit(comment.trim());
      setComment('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set record to pending');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Set Record to Pending</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              placeholder="Why is this record being set back to pending?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
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
              className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Set to Pending'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
