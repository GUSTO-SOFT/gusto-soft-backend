import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportExportService {
  toCsv(rows: Record<string, unknown>[]) {
    if (!rows.length) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  }

  toPdf(title: string, rows: Record<string, unknown>[]) {
    const lines = [
      title,
      '',
      ...rows.map((row) =>
        Object.entries(row)
          .map(([key, value]) => `${key}: ${value ?? ''}`)
          .join(' | '),
      ),
    ];
    const body = lines.join('\n').replace(/[()\\]/g, (match) => `\\${match}`);
    const stream = `BT /F1 10 Tf 40 780 Td 12 TL (${body}) Tj ET`;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${object}\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets
      .slice(1)
      .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`)
      .join('');
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf);
  }
}
