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
  onEdit: (record: Record) => void;
}

interface MenuItem {
  label: string;
  tone?: 'green' | 'yellow' | 'red';
  run?: () => void;
  to?: string;
}

const TONE_CLASS = {
  green: 'text-green-700 hover:bg-green-50',
  yellow: 'text-yellow-800 hover:bg-yellow-50',
  red: 'text-red-600 hover:bg-red-50',
  neutral: 'text-gray-700 hover:bg-gray-50',
};

export const ImplementationList: React.FC<ImplementationListProps> = ({
  records,
  isLoading,
  onConfirm,
  onViewDetails,
  onDelete,
  onRevert,
  onEdit,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [commentId, setCommentId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
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

  const buildMenu = (record: Record): MenuItem[] => {
    const items: MenuItem[] = [];

    if (!record.latest_confirmation_id) {
      items.push({ label: 'Confirm on Prod', tone: 'green', run: () => onConfirm(record.id) });
      items.push({ label: 'Edit', run: () => onEdit(record) });
    } else {
      items.push({ label: 'Set to Pending', tone: 'yellow', run: () => onRevert(record.id) });
      items.push({
        label: `${commentId === record.id ? 'Hide' : 'View'} Comment`,
        run: () => setCommentId(commentId === record.id ? null : record.id),
      });
    }

    items.push({
      label: `${expandedId === record.id ? 'Hide' : 'View'} History`,
      run: () => {
        setExpandedId(expandedId === record.id ? null : record.id);
        onViewDetails(record.id);
      },
    });
    items.push({ label: 'Report', to: `/records/${record.id}` });

    if (!record.latest_confirmed_at && record.created_by_user_id === user?.id) {
      items.push({ label: 'Delete', tone: 'red', run: () => onDelete(record.id) });
    }

    return items;
  };

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const menuItems = buildMenu(record);
        const menuOpen = openMenuId === record.id;

        return (
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

                <div className="flex-shrink-0 flex items-start gap-2">
                  <StatusBadge
                    isConfirmed={!!record.latest_confirmation_id}
                    confirmedAt={record.latest_confirmed_at}
                    confirmedBy={record.latest_confirmed_by_email}
                    updatedAt={record.latest_revert_at}
                    updatedBy={record.latest_revert_by_email}
                  />

                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(menuOpen ? null : record.id)}
                      aria-label="Record actions"
                      aria-expanded={menuOpen}
                      className="px-2 py-0.5 text-xl leading-none text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      ...
                    </button>

                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-white border border-gray-200 rounded-md shadow-lg py-1">
                          {menuItems.map((item, index) => {
                            const isDanger = item.tone === 'red';
                            const separator = isDanger && index > 0 ? 'border-t border-gray-200 mt-1 pt-1' : '';
                            const className = `block w-full text-left px-4 py-2 text-sm ${TONE_CLASS[item.tone ?? 'neutral']} ${separator}`;

                            if (item.to) {
                              return (
                                <Link
                                  key={item.label}
                                  to={item.to}
                                  onClick={() => setOpenMenuId(null)}
                                  className={className}
                                >
                                  {item.label}
                                </Link>
                              );
                            }

                            return (
                              <button
                                key={item.label}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  item.run?.();
                                }}
                                className={className}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
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
        );
      })}
    </div>
  );
};
