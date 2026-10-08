import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { records } from '../api/client';
import { jiraUrl } from '../utils/jira';

interface ReportRecord {
  id: number;
  pr_url: string;
  jira_keys?: string;
  description?: string;
  created_by_email?: string;
  created_at: string;
}

interface ReportRevert {
  id: number;
  reverted_by_email?: string;
  reverted_at: string;
  comment: string;
}

interface ReportConfirmation {
  id: number;
  confirmed_by_email?: string;
  confirmed_at: string;
  environment: string;
  notes?: string;
}

export const RecordReport = () => {
  const { id } = useParams();
  const [record, setRecord] = useState<ReportRecord | null>(null);
  const [confirmations, setConfirmations] = useState<ReportConfirmation[]>([]);
  const [reverts, setReverts] = useState<ReportRevert[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    records
      .getDetail(Number(id))
      .then((response) => {
        if (cancelled) return;
        setRecord(response.data.record);
        setConfirmations(response.data.confirmations);
        setReverts(response.data.reverts);
        setIsConfirmed(response.data.is_confirmed);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Failed to load report');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading report...</div>;
  }

  if (error || !record) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || 'Report not found'}</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800">Back to dashboard</Link>
      </div>
    );
  }

  const jiraKeys = record.jira_keys ? record.jira_keys.split(',').map((k) => k.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">Back to dashboard</Link>
          <button
            onClick={() => window.print()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Print / Save as PDF
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Post Implementation Report</h1>
        <p className="text-sm text-gray-500 mb-6">Record #{record.id}</p>

        <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="font-medium text-gray-700">PR URL</dt>
          <dd>
            <a href={record.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">
              {record.pr_url}
            </a>
          </dd>

          <dt className="font-medium text-gray-700">JIRA Tickets</dt>
          <dd>
            {jiraKeys.length
              ? jiraKeys.map((key, i) => (
                  <span key={key}>
                    {i > 0 && ', '}
                    <a href={jiraUrl(key)} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                      {key}
                    </a>
                  </span>
                ))
              : 'None'}
          </dd>

          <dt className="font-medium text-gray-700">Description</dt>
          <dd className="whitespace-pre-wrap">{record.description || 'None'}</dd>

          <dt className="font-medium text-gray-700">Created</dt>
          <dd>
            {new Date(record.created_at).toLocaleString()} by {record.created_by_email || 'Unknown'}
          </dd>

          <dt className="font-medium text-gray-700">Status</dt>
          <dd>
            {isConfirmed ? (
              <span className="text-green-700 font-medium">
                Confirmed on production
              </span>
            ) : (
              <span className="text-yellow-700 font-medium">Pending confirmation</span>
            )}
          </dd>
        </dl>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Confirmation History</h2>
        {confirmations.length === 0 ? (
          <p className="text-sm text-gray-500">No confirmations yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4 font-medium text-gray-700">Date and time</th>
                <th className="py-2 pr-4 font-medium text-gray-700">Confirmed by</th>
                <th className="py-2 pr-4 font-medium text-gray-700">Environment</th>
                <th className="py-2 font-medium text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              {confirmations.map((c) => (
                <tr key={c.id} className="border-b align-top">
                  <td className="py-2 pr-4">{new Date(c.confirmed_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{c.confirmed_by_email || 'Unknown'}</td>
                  <td className="py-2 pr-4 capitalize">{c.environment}</td>
                  <td className="py-2 whitespace-pre-wrap">{c.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reverts.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Set to Pending History</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4 font-medium text-gray-700">Date and time</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Changed by</th>
                  <th className="py-2 font-medium text-gray-700">Comment</th>
                </tr>
              </thead>
              <tbody>
                {reverts.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 pr-4">{new Date(r.reverted_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{r.reverted_by_email || 'Unknown'}</td>
                    <td className="py-2 whitespace-pre-wrap">{r.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};
