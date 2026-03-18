using System.Security.Claims;
using System.Text.Json;
using ExcelDataReader;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/portal/projects/{projectId:int}/forms/{faid:int}/bulk")]
[Authorize(Roles = "Admin,CIS,SuperCustomer,Customer")]
public class BulkSubmissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public BulkSubmissionsController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record BulkSubmissionDto(
        int Id, int ProjectFormAssignmentId, string FileName,
        string[] OriginalHeaders, string Status,
        int TotalRows, int PendingRows, int ApprovedRows, int RejectedRows,
        string? UploadedByName, DateTime CreatedAt, DateTime UpdatedAt,
        IEnumerable<BulkSubmissionRowDto> Rows);

    public record BulkSubmissionRowDto(
        int Id, int RowIndex, string Status, string? RejectionReason,
        Dictionary<string, string> RawData,
        IEnumerable<BulkSubmissionCellDto> Cells);

    public record BulkSubmissionCellDto(int Id, int FormFieldId, string Value);

    public record ColumnMappingRequest(Dictionary<string, int?> Mapping);
    public record UpdateCellRequest(int FormFieldId, string Value);
    public record BatchCellRequest(int FormFieldId, string Value, int[] RowIds);
    public record RejectRowRequest(string Reason);

    public record FinalizeResultDto(
        int ApprovedCount, int RejectedCount,
        IEnumerable<RejectedRowSummary> RejectedRows);

    public record RejectedRowSummary(int RowIndex, string? Reason);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool IsAdminOrCis() =>
        User.IsInRole("Admin") || User.IsInRole("CIS");

    private async Task<bool> CanAccessProject(int projectId)
    {
        if (IsAdminOrCis()) return true;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return await _db.ProjectUserAccess
            .AnyAsync(a => a.ProjectId == projectId && a.UserId == userId);
    }

    private async Task<ProjectFormAssignment?> GetAssignment(int projectId, int faid)
        => await _db.ProjectFormAssignments
            .Include(a => a.Form)
                .ThenInclude(f => f.Fields.Where(ff => !ff.IsArchived))
            .FirstOrDefaultAsync(a => a.Id == faid && a.ProjectId == projectId);

    private async Task<BulkSubmission?> GetActiveBulkSubmission(int faid)
        => await _db.BulkSubmissions
            .Include(b => b.Rows)
                .ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(b => b.ProjectFormAssignmentId == faid
                                   && b.Status != "Finalized");

    private static BulkSubmissionDto ToDto(BulkSubmission b, string? uploaderName) =>
        new(b.Id, b.ProjectFormAssignmentId, b.FileName,
            JsonSerializer.Deserialize<string[]>(b.OriginalHeadersJson) ?? [],
            b.Status,
            b.Rows.Count,
            b.Rows.Count(r => r.Status == "Pending"),
            b.Rows.Count(r => r.Status == "Approved"),
            b.Rows.Count(r => r.Status == "Rejected"),
            uploaderName, b.CreatedAt, b.UpdatedAt,
            b.Rows.OrderBy(r => r.RowIndex).Select(r => new BulkSubmissionRowDto(
                r.Id, r.RowIndex, r.Status, r.RejectionReason,
                JsonSerializer.Deserialize<Dictionary<string, string>>(r.RawDataJson) ?? [],
                r.Cells.Select(c => new BulkSubmissionCellDto(c.Id, c.FormFieldId, c.Value)))));

    // Parse CSV or XLSX file into (headers, rows)
    private static (string[] headers, List<Dictionary<string, string>> rows) ParseFile(IFormFile file)
    {
        // ExcelDataReader requires encoding registration for CSV support
        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

        using var stream = file.OpenReadStream();
        using var reader = file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
            ? ExcelReaderFactory.CreateCsvReader(stream)
            : ExcelReaderFactory.CreateReader(stream);

        var dataSet = reader.AsDataSet(new ExcelDataSetConfiguration
        {
            ConfigureDataTable = _ => new ExcelDataTableConfiguration { UseHeaderRow = true }
        });

        if (dataSet.Tables.Count == 0)
            return ([], []);

        var table = dataSet.Tables[0];
        var headers = table.Columns.Cast<System.Data.DataColumn>()
            .Select(c => c.ColumnName.Trim())
            .ToArray();

        var rows = new List<Dictionary<string, string>>();
        foreach (System.Data.DataRow row in table.Rows)
        {
            var dict = new Dictionary<string, string>();
            for (int i = 0; i < headers.Length; i++)
                dict[headers[i]] = row[i]?.ToString()?.Trim() ?? string.Empty;
            rows.Add(dict);
        }

        return (headers, rows);
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    // POST /upload — customer uploads CSV/XLSX file
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(int projectId, int faid, IFormFile file)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var assignment = await GetAssignment(projectId, faid);
        if (assignment is null) return NotFound();

        if (!assignment.Form.AllowFileSubmission)
            return BadRequest(new { message = "File submission is not enabled for this form." });

        // Customer-only: verify assignment
        if (!IsAdminOrCis() && !User.IsInRole("SuperCustomer"))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (assignment.AssignedToUserId != null && assignment.AssignedToUserId != userId)
                return Forbid();
        }

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".csv" && ext != ".xlsx")
            return BadRequest(new { message = "Only CSV and XLSX files are supported." });

        // Delete any existing non-finalized bulk submission for this assignment
        var existing = await GetActiveBulkSubmission(faid);
        if (existing is not null)
            _db.BulkSubmissions.Remove(existing);

        (var headers, var rows) = ParseFile(file);
        if (rows.Count == 0)
            return BadRequest(new { message = "The file contains no data rows." });

        var uploaderId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var bulk = new BulkSubmission
        {
            ProjectFormAssignmentId = faid,
            UploadedByUserId = uploaderId,
            FileName = file.FileName,
            OriginalHeadersJson = JsonSerializer.Serialize(headers),
            Status = "Uploaded",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        for (int i = 0; i < rows.Count; i++)
        {
            bulk.Rows.Add(new BulkSubmissionRow
            {
                RowIndex = i,
                RawDataJson = JsonSerializer.Serialize(rows[i]),
                Status = "Pending",
            });
        }

        _db.BulkSubmissions.Add(bulk);

        if (assignment.Status == "NotStarted")
        {
            assignment.Status = "InProgress";
            assignment.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var uploaderName = uploaderId is not null
            ? (await _db.Users.FirstOrDefaultAsync(u => u.Id == uploaderId))?.FullName
            : null;

        return Ok(ToDto(bulk, uploaderName));
    }

    // GET / — get active bulk submission for this assignment
    [HttpGet]
    public async Task<IActionResult> GetCurrent(int projectId, int faid)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var assignmentExists = await _db.ProjectFormAssignments
            .AnyAsync(a => a.Id == faid && a.ProjectId == projectId);
        if (!assignmentExists) return NotFound();

        var bulk = await GetActiveBulkSubmission(faid);
        if (bulk is null) return NotFound();

        var uploaderName = bulk.UploadedByUserId is not null
            ? (await _db.Users.FirstOrDefaultAsync(u => u.Id == bulk.UploadedByUserId))?.FullName
            : null;

        return Ok(ToDto(bulk, uploaderName));
    }

    // PUT /column-mapping — admin applies column→field mapping, populates cells
    [HttpPut("column-mapping")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> ApplyColumnMapping(int projectId, int faid,
        [FromBody] ColumnMappingRequest req)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var assignment = await GetAssignment(projectId, faid);
        if (assignment is null) return NotFound();

        var bulk = await _db.BulkSubmissions
            .Include(b => b.Rows)
                .ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(b => b.ProjectFormAssignmentId == faid
                                   && b.Status != "Finalized");
        if (bulk is null) return NotFound(new { message = "No active bulk submission found." });

        var fields = assignment.Form.Fields;

        // Auto-fill fields: always include with their fixed value
        var autoFillFields = fields
            .Where(f => !string.IsNullOrEmpty(f.AutoFillValue))
            .ToList();

        foreach (var row in bulk.Rows.Where(r => r.Status == "Pending"))
        {
            // Remove old cells
            _db.BulkSubmissionCells.RemoveRange(row.Cells);
            row.Cells.Clear();

            var rawData = JsonSerializer.Deserialize<Dictionary<string, string>>(row.RawDataJson)
                          ?? [];

            // Create cells for mapped columns
            foreach (var (header, fieldId) in req.Mapping)
            {
                if (fieldId is null) continue;
                var field = fields.FirstOrDefault(f => f.Id == fieldId.Value);
                if (field is null) continue;
                if (!string.IsNullOrEmpty(field.AutoFillValue)) continue; // handled below

                var rawValue = rawData.TryGetValue(header, out var v) ? v : string.Empty;
                row.Cells.Add(new BulkSubmissionCell
                {
                    FormFieldId = field.Id,
                    Value = rawValue,
                });
            }

            // Create cells for fields NOT in the mapping (unmapped form fields get empty cell)
            var mappedFieldIds = req.Mapping.Values.Where(v => v.HasValue).Select(v => v!.Value).ToHashSet();
            foreach (var field in fields.Where(f => !mappedFieldIds.Contains(f.Id)
                                                  && string.IsNullOrEmpty(f.AutoFillValue)))
            {
                row.Cells.Add(new BulkSubmissionCell
                {
                    FormFieldId = field.Id,
                    Value = string.Empty,
                });
            }

            // Auto-fill cells
            foreach (var afField in autoFillFields)
            {
                row.Cells.Add(new BulkSubmissionCell
                {
                    FormFieldId = afField.Id,
                    Value = afField.AutoFillValue!,
                });
            }
        }

        bulk.Status = "InReview";
        bulk.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Reload with cells
        await _db.Entry(bulk).Collection(b => b.Rows).Query()
            .Include(r => r.Cells)
            .LoadAsync();

        var uploaderName = bulk.UploadedByUserId is not null
            ? (await _db.Users.FirstOrDefaultAsync(u => u.Id == bulk.UploadedByUserId))?.FullName
            : null;

        return Ok(ToDto(bulk, uploaderName));
    }

    // PUT /rows/{rowId}/cell — admin updates a single cell
    [HttpPut("rows/{rowId:int}/cell")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> UpdateCell(int projectId, int faid, int rowId,
        [FromBody] UpdateCellRequest req)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var row = await _db.BulkSubmissionRows
            .Include(r => r.BulkSubmission)
            .Include(r => r.Cells)
            .FirstOrDefaultAsync(r => r.Id == rowId
                && r.BulkSubmission.ProjectFormAssignmentId == faid
                && _db.ProjectFormAssignments.Any(a => a.Id == faid && a.ProjectId == projectId));
        if (row is null) return NotFound();

        var cell = row.Cells.FirstOrDefault(c => c.FormFieldId == req.FormFieldId);
        if (cell is null)
        {
            cell = new BulkSubmissionCell { FormFieldId = req.FormFieldId, Value = req.Value };
            row.Cells.Add(cell);
        }
        else
        {
            cell.Value = req.Value;
        }

        await _db.SaveChangesAsync();
        return Ok(new BulkSubmissionCellDto(cell.Id, cell.FormFieldId, cell.Value));
    }

    // PUT /rows/batch-cells — smart fill: apply value to many rows at once
    [HttpPut("rows/batch-cells")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> BatchUpdateCells(int projectId, int faid,
        [FromBody] BatchCellRequest req)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var rows = await _db.BulkSubmissionRows
            .Include(r => r.BulkSubmission)
            .Include(r => r.Cells)
            .Where(r => req.RowIds.Contains(r.Id)
                && r.BulkSubmission.ProjectFormAssignmentId == faid
                && _db.ProjectFormAssignments.Any(a => a.Id == faid && a.ProjectId == projectId)
                && r.Status == "Pending")
            .ToListAsync();

        var updatedCells = new List<BulkSubmissionCellDto>();

        foreach (var row in rows)
        {
            var cell = row.Cells.FirstOrDefault(c => c.FormFieldId == req.FormFieldId);
            if (cell is null)
            {
                cell = new BulkSubmissionCell { FormFieldId = req.FormFieldId, Value = req.Value };
                row.Cells.Add(cell);
            }
            else
            {
                cell.Value = req.Value;
            }
            updatedCells.Add(new BulkSubmissionCellDto(cell.Id, cell.FormFieldId, cell.Value));
        }

        await _db.SaveChangesAsync();
        return Ok(updatedCells);
    }

    // DELETE /rows/{rowId} — delete a row from staging
    [HttpDelete("rows/{rowId:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> DeleteRow(int projectId, int faid, int rowId)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var row = await _db.BulkSubmissionRows
            .Include(r => r.BulkSubmission)
            .FirstOrDefaultAsync(r => r.Id == rowId
                && r.BulkSubmission.ProjectFormAssignmentId == faid
                && _db.ProjectFormAssignments.Any(a => a.Id == faid && a.ProjectId == projectId));
        if (row is null) return NotFound();

        _db.BulkSubmissionRows.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /rows/{rowId}/reject — reject a row with reason
    [HttpPut("rows/{rowId:int}/reject")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> RejectRow(int projectId, int faid, int rowId,
        [FromBody] RejectRowRequest req)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var row = await _db.BulkSubmissionRows
            .Include(r => r.BulkSubmission)
            .Include(r => r.Cells)
            .FirstOrDefaultAsync(r => r.Id == rowId
                && r.BulkSubmission.ProjectFormAssignmentId == faid
                && _db.ProjectFormAssignments.Any(a => a.Id == faid && a.ProjectId == projectId));
        if (row is null) return NotFound();

        row.Status = "Rejected";
        row.RejectionReason = req.Reason?.Trim();
        await _db.SaveChangesAsync();

        return Ok(new BulkSubmissionRowDto(
            row.Id, row.RowIndex, row.Status, row.RejectionReason,
            JsonSerializer.Deserialize<Dictionary<string, string>>(row.RawDataJson) ?? [],
            row.Cells.Select(c => new BulkSubmissionCellDto(c.Id, c.FormFieldId, c.Value))));
    }

    // PUT /rows/{rowId}/restore — restore a rejected row back to Pending
    [HttpPut("rows/{rowId:int}/restore")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> RestoreRow(int projectId, int faid, int rowId)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var row = await _db.BulkSubmissionRows
            .Include(r => r.BulkSubmission)
            .Include(r => r.Cells)
            .FirstOrDefaultAsync(r => r.Id == rowId
                && r.BulkSubmission.ProjectFormAssignmentId == faid
                && _db.ProjectFormAssignments.Any(a => a.Id == faid && a.ProjectId == projectId));
        if (row is null) return NotFound();

        row.Status = "Pending";
        row.RejectionReason = null;
        await _db.SaveChangesAsync();

        return Ok(new BulkSubmissionRowDto(
            row.Id, row.RowIndex, row.Status, row.RejectionReason,
            JsonSerializer.Deserialize<Dictionary<string, string>>(row.RawDataJson) ?? [],
            row.Cells.Select(c => new BulkSubmissionCellDto(c.Id, c.FormFieldId, c.Value))));
    }

    // POST /finalize — convert approved rows to FormSubmissions
    [HttpPost("finalize")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> Finalize(int projectId, int faid)
    {
        if (!await CanAccessProject(projectId)) return Forbid();

        var assignment = await GetAssignment(projectId, faid);
        if (assignment is null) return NotFound();

        var bulk = await _db.BulkSubmissions
            .Include(b => b.Rows)
                .ThenInclude(r => r.Cells)
            .FirstOrDefaultAsync(b => b.ProjectFormAssignmentId == faid
                                   && b.Status != "Finalized");
        if (bulk is null) return NotFound(new { message = "No active bulk submission found." });

        var fields = assignment.Form.Fields;
        var autoFillMap = fields
            .Where(f => !string.IsNullOrEmpty(f.AutoFillValue))
            .ToDictionary(f => f.Id, f => f.AutoFillValue!);

        var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var pendingRows = bulk.Rows.Where(r => r.Status == "Pending").ToList();
        int approvedCount = 0;

        foreach (var row in pendingRows)
        {
            var submission = new FormSubmission
            {
                ProjectFormAssignmentId = faid,
                SubmittedByUserId = adminUserId,
                Status = "Submitted",
                SubmittedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.FormSubmissions.Add(submission);
            await _db.SaveChangesAsync(); // get submission.Id

            // Add cell values (skip auto-fill fields — injected below)
            foreach (var cell in row.Cells)
            {
                if (autoFillMap.ContainsKey(cell.FormFieldId)) continue;
                _db.FormSubmissionAnswers.Add(new FormSubmissionAnswer
                {
                    FormSubmissionId = submission.Id,
                    FormFieldId = cell.FormFieldId,
                    Value = cell.Value,
                });
            }

            // Inject auto-fill answers
            foreach (var (fieldId, value) in autoFillMap)
            {
                _db.FormSubmissionAnswers.Add(new FormSubmissionAnswer
                {
                    FormSubmissionId = submission.Id,
                    FormFieldId = fieldId,
                    Value = value,
                });
            }

            row.Status = "Approved";
            row.ResultFormSubmissionId = submission.Id;
            approvedCount++;
        }

        var rejectedRows = bulk.Rows
            .Where(r => r.Status == "Rejected")
            .Select(r => new RejectedRowSummary(r.RowIndex + 1, r.RejectionReason))
            .ToList();

        bulk.Status = "Finalized";
        bulk.UpdatedAt = DateTime.UtcNow;
        assignment.Status = "Submitted";
        assignment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
        await _audit.LogAsync(User, "bulk.finalized", "BulkSubmission", bulk.Id.ToString(),
            assignment.Form?.Name,
            projectId: projectId, projectName: project?.CustomerName,
            detail: $"Bulk file submission finalized: {approvedCount} approved, {rejectedRows.Count} rejected");

        return Ok(new FinalizeResultDto(approvedCount, rejectedRows.Count, rejectedRows));
    }
}
