import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { records } from '../api/client';
import { Record } from '../hooks/useRecords';
import { jiraUrl } from '../utils/jira';
import { formatDateTime } from '../utils/date';
import { downloadExcel } from '../utils/excel';

export const GeneralReport = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 1000, offset: 0 };
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      const response = await records.list(params);
      setRows(response.data.records);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('', '');
  }, []);

  const confirmedCount = rows.filter((r) => !!r.latest_confirmation_id).length;

  const statusText = (r: Record) =>
    r.latest_confirmation_id
      ? 'Confirmed'
      : r.latest_revert_at
        ? `Updated ${formatDateTime(r.latest_revert_at)} by ${r.latest_revert_by_email}`
        : 'Pending';

  const handleExport = () => {
    const dateLabel = `${dateFrom || 'start'}_to_${dateTo || 'today'}`;
    downloadExcel(`general-report_${dateLabel}`, [
      {
        name: 'General Report',
        columns: [
          { header: 'Created', key: 'created', width: 14 },
          { header: 'PR URL', key: 'pr', width: 60 },
          { header: 'JIRA', key: 'jira', width: 20 },
          { header: 'Created by', key: 'createdBy', width: 34 },
          { header: 'Status', key: 'status', width: 48 },
          { header: 'Last confirmed', key: 'confirmedAt', width: 20 },
          { header: 'Confirmed by', key: 'confirmedBy', width: 34 },
          { header: 'Category', key: 'category', width: 22 },
          { header: 'Post Implementation Comment', key: 'comment', width: 50 },
        ],
        rows: rows.map((r) => ({
          created: formatDateTime(r.created_at),
          pr: r.pr_url,
          jira: r.jira_keys,
          createdBy: r.created_by_email,
          status: statusText(r),
          confirmedAt: r.latest_confirmed_at ? formatDateTime(r.latest_confirmed_at) : '',
          confirmedBy: r.latest_confirmed_by_email,
          category: r.latest_confirmation_category,
          comment: r.latest_confirmation_notes,
        })),
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-8 print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">Back to dashboard</Link>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={loading || rows.length === 0}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Export to Excel
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">General Report</h1>
        <p className="text-sm text-gray-500 mb-6">
          {dateFrom || dateTo
            ? `Records created ${dateFrom || 'from the start'} to ${dateTo || 'today'}`
            : 'All records'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(dateFrom, dateTo);
          }}
          className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 print:hidden"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              load('', '');
            }}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            Clear
          </button>
        </form>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
              <div className="text-xs text-gray-500">Records</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-green-700">{confirmedCount}</div>
              <div className="text-xs text-gray-500">Confirmed</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-yellow-700">{rows.length - confirmedCount}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600 text-sm">Loading report...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-sm">No records found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4 font-medium text-gray-700">Created</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">PR</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">JIRA</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Created by</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Status</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Last confirmed</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Confirmed by</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Category</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Post Implementation Comment</th>
                  <th className="py-2 font-medium text-gray-700 print:hidden">Report</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-4 break-all">
                      <a href={r.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                        {r.pr_url}
                      </a>
                    </td>
                    <td className="py-2 pr-4">
                      {r.jira_keys
                        ? r.jira_keys.split(',').map((key, i) => (
                            <span key={key}>
                              {i > 0 && ', '}
                              <a href={jiraUrl(key.trim())} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                                {key.trim()}
                              </a>
                            </span>
                          ))
                        : '-'}
                    </td>
                    <td className="py-2 pr-4">{r.created_by_email || '-'}</td>
                    <td className="py-2 pr-4">
                      {r.latest_confirmation_id ? (
                        <span className="text-green-700 font-medium">Confirmed</span>
                      ) : r.latest_revert_at ? (
                        <span className="text-blue-700 font-medium">
                          Updated {formatDateTime(r.latest_revert_at)} by {r.latest_revert_by_email}
                        </span>
                      ) : (
                        <span className="text-yellow-700 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {r.latest_confirmed_at ? new Date(r.latest_confirmed_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-2 pr-4">{r.latest_confirmed_by_email || '-'}</td>
                    <td className="py-2 pr-4">{r.latest_confirmation_category || '-'}</td>
                    <td className="py-2 pr-4 whitespace-pre-wrap">{r.latest_confirmation_notes || '-'}</td>
                    <td className="py-2 print:hidden">
                      <Link to={`/records/${r.id}`} className="text-blue-600 hover:text-blue-800">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
