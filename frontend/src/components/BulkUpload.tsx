import { useEffect, useState } from 'react';
import ExcelJS from 'exceljs';
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
  onComplete: (createdCount: number) => void;
  resetToken: number;
}

const parseWorkbook = async (file: File): Promise<ParsedRow[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await file.arrayBuffer()) as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The file has no sheet');

  const headerRow = sheet.getRow(1);
  let prCol = 0;
  let jiraCol = 0;
  headerRow.eachCell((cell, colNumber) => {
    const header = cell.text.trim().toUpperCase();
    if (header === 'PR_URL') prCol = colNumber;
    if (header === 'JIRA_URL') jiraCol = colNumber;
  });

  if (!prCol) throw new Error('The template must have a PR_URL column in row 1');

  const rows: ParsedRow[] = [];
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    const pr_url = row.getCell(prCol).text.trim();
    const jira_keys = jiraCol ? row.getCell(jiraCol).text.trim() : '';
    if (!pr_url && !jira_keys) continue;
    rows.push({ line: n, pr_url, jira_keys });
  }
  return rows;
};

export const BulkUpload: React.FC<BulkUploadProps> = ({ onComplete, resetToken }) => {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isUploading) return;
    setDone(false);
    setCreated(0);
    setFailures([]);
  }, [resetToken]);

  const handleFile = async (file: File) => {
    setFileError(null);
    setCreated(0);
    setFailures([]);
    setDone(false);
    try {
      const parsed = await parseWorkbook(file);
      setRows(parsed);
      setFileName(file.name);
      if (parsed.length === 0) setFileError('No rows found. Add PR URLs under the header row.');
    } catch (err: any) {
      setRows([]);
      setFileName('');
      setFileError(err.message || 'Could not read the Excel file');
    }
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
    onComplete(createdCount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-2">Upload PR List</h2>
      <p className="text-xs text-gray-500 mb-2">
        Upload Excel file using attached template. PR URL is required but JIRA URL is optional. Enter related PR and
        Jira Ticket on same row.
      </p>
      <a
        href="/Upload_Template.xlsx"
        download
        className="text-xs text-blue-600 hover:text-blue-800 underline mb-4 inline-block"
      >
        Download template
      </a>

      <div>
        <input
          type="file"
          accept=".xlsx"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
          className="text-sm"
        />
      </div>

      {fileError && <p className="mt-4 text-sm text-red-700">{fileError}</p>}

      {rows.length > 0 && !isUploading && (
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-gray-700">
            {fileName}: {rows.length} record{rows.length === 1 ? '' : 's'} ready
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
        <div className="relative mt-4 text-sm">
          <button
            onClick={() => setDone(false)}
            aria-label="Close"
            className="absolute -top-1 right-0 text-gray-500 hover:text-gray-800 text-lg leading-none"
          >
            ×
          </button>
          <p className="text-green-700 font-medium">Created {created} record{created === 1 ? '' : 's'}.</p>
          {failures.length > 0 && (
            <div className="mt-2">
              <p className="text-red-700 font-medium">{failures.length} failed:</p>
              <ul className="list-disc ml-6 text-red-700">
                {failures.map((f) => (
                  <li key={f.line}>
                    Row {f.line} ({f.pr_url || 'no PR URL'}): {f.error}
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
