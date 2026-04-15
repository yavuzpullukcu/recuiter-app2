/**
 * Robust CSV Parser that properly handles quoted fields
 * Supports:
 * - Quoted fields with commas inside
 * - Escaped quotes within fields
 * - Both CRLF and LF line endings
 */

export function parseCSV(csvText: string): Record<string, string>[] {
  // Normalize line endings
  const text = csvText.replace(/\r\n/g, '\n');
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    // Only add non-empty rows
    if (Object.values(row).some(v => v.trim())) {
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: ""
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
      continue;
    }

    // Regular character
    current += char;
    i++;
  }

  // Add last field
  result.push(current.trim());

  return result;
}
