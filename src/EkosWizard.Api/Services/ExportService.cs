using ClosedXML.Excel;
using CsvHelper;
using ImpWizard.Infrastructure.Data;
using System.Globalization;

namespace ImpWizard.Api.Services;

public class ExportService
{
    // Single-sheet Excel export.
    public byte[] ExportToXlsx(ImportTemplate template, string? sheetName = null)
    {
        return ExportToXlsx([(template, sheetName ?? template.Name)]);
    }

    // Multi-sheet Excel export: pass multiple (template, sheetName) pairs.
    public byte[] ExportToXlsx(IEnumerable<(ImportTemplate Template, string SheetName)> sheets)
    {
        using var workbook = new XLWorkbook();

        foreach (var (template, sheetName) in sheets)
        {
            var safeName = TrimSheetName(sheetName);
            var ws = workbook.Worksheets.Add(safeName);
            WriteHeaderRow(ws, template);
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    // CSV export (header row only — the user fills it in).
    public byte[] ExportToCsv(ImportTemplate template)
    {
        using var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, leaveOpen: true);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        var columns = template.Columns.OrderBy(c => c.SortOrder).ToList();
        foreach (var col in columns)
        {
            csv.WriteField(col.Header);
        }
        csv.NextRecord();
        writer.Flush();

        return ms.ToArray();
    }

    private static void WriteHeaderRow(IXLWorksheet ws, ImportTemplate template)
    {
        var columns = template.Columns.OrderBy(c => c.SortOrder).ToList();

        for (int i = 0; i < columns.Count; i++)
        {
            var col = columns[i];
            var cell = ws.Cell(1, i + 1);
            cell.Value = col.Header;
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB");
            cell.Style.Font.FontColor = XLColor.White;

            // Add in-cell dropdown validation for Dropdown fields
            if (col.DataType == "Dropdown" && !string.IsNullOrEmpty(col.AllowedValues))
            {
                try
                {
                    var values = System.Text.Json.JsonSerializer.Deserialize<string[]>(col.AllowedValues);
                    if (values?.Length > 0)
                    {
                        var dataRange = ws.Column(i + 1).Cells(2, 1000);
                        var validation = dataRange.FirstOrDefault()?.GetDataValidation();
                        if (validation != null)
                        {
                            validation.AllowedValues = XLAllowedValues.List;
                            validation.MinValue = string.Join(",", values);
                            validation.ShowErrorMessage = true;
                            validation.ErrorTitle = "Invalid value";
                            validation.ErrorMessage = $"Please select one of: {string.Join(", ", values)}";
                        }
                    }
                }
                catch { /* ignore malformed JSON */ }
            }
        }

        // Auto-fit columns
        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);
    }

    private static string TrimSheetName(string name)
    {
        // Excel sheet names max 31 chars, no special chars
        var invalid = new[] { '\\', '/', '?', '*', '[', ']', ':' };
        var safe = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        return safe.Length > 31 ? safe[..31] : safe;
    }
}
