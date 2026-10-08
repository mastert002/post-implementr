import ExcelJS from 'exceljs';

export interface SheetColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelSheet {
  name: string;
  columns: SheetColumn[];
  rows: Record<string, string | number | null | undefined>[];
}

export const downloadExcel = async (fileName: string, sheets: ExcelSheet[]) => {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
    ws.getRow(1).font = { bold: true };
    sheet.rows.forEach((row) => {
      ws.addRow(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])));
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
