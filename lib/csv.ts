export function csvEscape(value: unknown) {
  const string = String(value ?? "");
  return /[",\r\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
}

/** Downloads a CSV with a BOM so Excel reads accented characters correctly. */
export function saveCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
