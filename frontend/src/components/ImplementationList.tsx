import { Record } from '../hooks/useRecords';
import { StatusBadge } from './StatusBadge';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { jiraUrl, jiraLabel } from '../utils/jira';
import { formatDateTime } from '../utils/date';

interface ImplementationListProps {
  records: Record[];
  isLoading: boolean;
  onConfirm: (id: number) => void;
  onViewDetails: (id: number) => void;
  onDelete: (id: number) => void;
  onRevert: (id: number) => void;
}

export const ImplementationList: React.FC<ImplementationListProps> = ({
  records,
  isLoading,
  onConfirm,
  onViewDetails,
  onDelete,
  onRevert,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [commentId, setCommentId] = useState<number | null>(null);
  const { user } = useAuth();

  if (isLoading) {
    return <div className="text-center py-8">Loading records...</div>;
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No implementation records yet.</p>
        <p className="text-gray-400 text-sm">Add one using the form above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="bg-white rounded-lg shadow hover:shadow-md transition">
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <a
                    href={record.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium truncate"
                  >
                    {record.pr_url}
                  </a>
                </div>

                {record.jira_keys && (
                  <div className="mb-2">
                    {record.jira_keys.split(',').map((key) => (
                      <a
                        key={key}
                        href={jiraUrl(key.trim())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mr-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 hover:underline"
                      >
                        {jiraLabel(key.trim(), record.jira_titles)}
                      </a>
                    ))}
                  </div>
                )}

                {record.description && (
                  <p className="text-sm text-gray-600 mb-2">{record.description}</p>
                )}

                <div className="text-xs text-gray-500">
                  Created {new Date(record.created_at).toLocaleDateString()} by {record.created_by_email}
                </div>
              </div>

              <div className="flex-shrink-0">
                <StatusBadge
                  isConfirmed={!!record.latest_confirmation_id}
                  confirmedAt={record.latest_confirmed_at}
                  confirmedBy={record.latest_confirmed_by_email}
                  updatedAt={record.latest_revert_at}
                  updatedBy={record.latest_revert_by_email}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t">
              {!record.latest_confirmation_id && (
                <button
                  onClick={() => onConfirm(record.id)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Confirm on Prod
                </button>
              )}
              {record.latest_confirmation_id && (
                <button
                  onClick={() => setCommentId(commentId === record.id ? null : record.id)}
                  className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  {commentId === record.id ? 'Hide' : 'View'} Comment
                </button>
              )}
              <button
                onClick={() => {
                  setExpandedId(expandedId === record.id ? null : record.id);
                  onViewDetails(record.id);
                }}
                className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                {expandedId === record.id ? 'Hide' : 'View'} History
              </button>
              <Link
                to={`/records/${record.id}`}
                className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Report
              </Link>
              {record.latest_confirmation_id && (
                <button
                  onClick={() => onRevert(record.id)}
                  className="px-3 py-1 text-sm text-yellow-700 border border-yellow-400 rounded hover:bg-yellow-50"
                >
                  Set to Pending
                </button>
              )}
              {!record.latest_confirmed_at && record.created_by_user_id === user?.id && (
                <button
                  onClick={() => onDelete(record.id)}
                  className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {commentId === record.id && record.latest_confirmation_id && (
            <div className="bg-gray-50 border-t p-4">
              <h4 className="font-semibold text-sm mb-2">Post Implementation Comment</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {record.latest_confirmation_notes || '-'}
              </p>
            </div>
          )}

          {expandedId === record.id && (
            <div className="bg-gray-50 border-t p-4">
              <h4 className="font-semibold text-sm mb-2">Confirmation History</h4>
              <div className="text-xs text-gray-600">
                {record.latest_confirmed_at && (
                  <div className="mb-2">
                    <p>Confirmed on {new Date(record.latest_confirmed_at).toLocaleString()}</p>
                    <p>by {record.latest_confirmed_by_email}</p>
                  </div>
                )}
                {record.latest_revert_at && (
                  <div className="mb-2">
                    <p>Updated on {formatDateTime(record.latest_revert_at)} by {record.latest_revert_by_email}</p>
                    <p className="whitespace-pre-wrap">Comment: {record.latest_revert_comment}</p>
                  </div>
                )}
                {!record.latest_confirmed_at && !record.latest_revert_at && <p>No history yet</p>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
