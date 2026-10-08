import { useState } from 'react';
import { records } from '../api/client';

interface ParsedRow {
  line: number;
  pr_url: string;
  jira_keys: string;
}

interface Failure {
  line: number;
  pr_url: string;
  error: string;
}

interface BulkUploadProps {
  onComplete: () => void;
}

const parseFile = (text: string): ParsedRow[] => {
  const rows: ParsedRow[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    if (index === 0 && line.toLowerCase().startsWith('pr_url')) return;

    const commaAt = line.indexOf(',');
    const pr_url = (commaAt >= 0 ? line.slice(0, commaAt) : line).trim().replace(/^"|"$/g, '');
    const jira_keys = commaAt >= 0 ? line.slice(commaAt + 1).trim().replace(/^"|"$/g, '') : '';
    rows.push({ line: index + 1, pr_url, jira_keys });
  });
  return rows;
};

export const BulkUpload: React.FC<BulkUploadProps> = ({ onComplete }) => {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [done, setDone] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setRows(parseFile(text));
    setFileName(file.name);
    setCreated(0);
    setFailures([]);
    setDone(false);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setDone(false);
    setCreated(0);
    setFailures([]);
    setProgress(0);

    let createdCount = 0;
    const failed: Failure[] = [];

    for (const row of rows) {
      try {
        await records.create({
          pr_url: row.pr_url,
          jira_keys: row.jira_keys || undefined,
        });
        createdCount++;
      } catch (err: any) {
        failed.push({
          line: row.line,
          pr_url: row.pr_url,
          error: err.response?.data?.error || 'Failed to create record',
        });
      }
      setProgress((p) => p + 1);
    }

    setCreated(createdCount);
    setFailures(failed);
    setIsUploading(false);
    setDone(true);
    setRows([]);
    setFileName('');
    onComplete();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-2">Upload PR List</h2>
      <p className="text-xs text-gray-500 mb-4">
        CSV or TXT file, one PR per line: <code>https://github.com/owner/repo/pull/123</code> or{' '}
        <code>https://github.com/owner/repo/pull/123,https://your-site.atlassian.net/browse/PROJ-123</code>.
        A header line starting with <code>pr_url</code> is skipped.
      </p>

      <input
        type="file"
        accept=".csv,.txt"
        disabled={isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
        className="text-sm"
      />

      {rows.length > 0 && !isUploading && (
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-gray-700">
            {fileName}: {rows.length} PR{rows.length === 1 ? '' : 's'} ready
          </span>
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Upload {rows.length} record{rows.length === 1 ? '' : 's'}
          </button>
          <button
            onClick={() => setRows([])}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {isUploading && (
        <p className="mt-4 text-sm text-gray-700">
          Uploading... {progress} of {rows.length} processed
        </p>
      )}

      {done && (
        <div className="mt-4 text-sm">
          <p className="text-green-700 font-medium">Created {created} record{created === 1 ? '' : 's'}.</p>
          {failures.length > 0 && (
            <div className="mt-2">
              <p className="text-red-700 font-medium">{failures.length} failed:</p>
              <ul className="list-disc ml-6 text-red-700">
                {failures.map((f) => (
                  <li key={f.line}>
                    Line {f.line} ({f.pr_url}): {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
