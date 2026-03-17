using System.Globalization;
using System.Security.Claims;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "Admin,CIS")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditController(AppDbContext db) => _db = db;

    // Returns allowed project IDs for a CIS user based on their program access.
    // Returns null if the user is Admin (no restriction) or has no program restrictions.
    private async Task<List<int>?> GetCisAllowedProjectIds()
    {
        if (!User.IsInRole("CIS") || User.IsInRole("Admin")) return null;

        var cisUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var allowedProgramIds = await _db.UserProgramAccess
            .Where(upa => upa.UserId == cisUserId)
            .Select(upa => upa.ProgramId)
            .ToListAsync();

        if (allowedProgramIds.Count == 0) return null;

        return await _db.Projects
            .Where(p => p.ProgramId != null && allowedProgramIds.Contains(p.ProgramId!.Value))
            .Select(p => p.Id)
            .ToListAsync();
    }

    public record AuditLogEntryDto(
        long Id,
        DateTime Timestamp,
        string UserId,
        string UserFullName,
        string UserRole,
        string Action,
        string EntityType,
        string? EntityId,
        string? EntityName,
        int? ProjectId,
        string? ProjectName,
        string? Detail);

    public record AuditLogPagedResult(
        IEnumerable<AuditLogEntryDto> Items,
        int TotalCount,
        int Page,
        int PageSize);

    [HttpGet]
    public async Task<ActionResult<AuditLogPagedResult>> GetAuditLog(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? userSearch = null,
        [FromQuery] string? role = null,
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.AuditLogEntries.AsQueryable();

        // CIS program restriction: limit to projects in allowed programs
        var allowedProjectIds = await GetCisAllowedProjectIds();
        if (allowedProjectIds != null)
            q = q.Where(a => a.ProjectId != null && allowedProjectIds.Contains(a.ProjectId!.Value));

        if (from.HasValue) q = q.Where(a => a.Timestamp >= from.Value);
        if (to.HasValue) q = q.Where(a => a.Timestamp <= to.Value);
        if (!string.IsNullOrWhiteSpace(userId)) q = q.Where(a => a.UserId == userId);
        if (!string.IsNullOrWhiteSpace(userSearch)) q = q.Where(a => a.UserFullName.Contains(userSearch));
        if (!string.IsNullOrWhiteSpace(role)) q = q.Where(a => a.UserRole == role);
        if (!string.IsNullOrWhiteSpace(action)) q = q.Where(a => a.Action.StartsWith(action));
        if (!string.IsNullOrWhiteSpace(entityType)) q = q.Where(a => a.EntityType == entityType);
        if (projectId.HasValue) q = q.Where(a => a.ProjectId == projectId.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogEntryDto(
                a.Id, a.Timestamp, a.UserId, a.UserFullName, a.UserRole,
                a.Action, a.EntityType, a.EntityId, a.EntityName,
                a.ProjectId, a.ProjectName, a.Detail))
            .ToListAsync();

        return Ok(new AuditLogPagedResult(items, total, page, pageSize));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? userSearch = null,
        [FromQuery] string? role = null,
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] int? projectId = null)
    {
        var q = _db.AuditLogEntries.AsQueryable();

        // CIS program restriction: limit to projects in allowed programs
        var allowedProjectIds = await GetCisAllowedProjectIds();
        if (allowedProjectIds != null)
            q = q.Where(a => a.ProjectId != null && allowedProjectIds.Contains(a.ProjectId!.Value));

        if (from.HasValue) q = q.Where(a => a.Timestamp >= from.Value);
        if (to.HasValue) q = q.Where(a => a.Timestamp <= to.Value);
        if (!string.IsNullOrWhiteSpace(userId)) q = q.Where(a => a.UserId == userId);
        if (!string.IsNullOrWhiteSpace(userSearch)) q = q.Where(a => a.UserFullName.Contains(userSearch));
        if (!string.IsNullOrWhiteSpace(role)) q = q.Where(a => a.UserRole == role);
        if (!string.IsNullOrWhiteSpace(action)) q = q.Where(a => a.Action.StartsWith(action));
        if (!string.IsNullOrWhiteSpace(entityType)) q = q.Where(a => a.EntityType == entityType);
        if (projectId.HasValue) q = q.Where(a => a.ProjectId == projectId.Value);

        var rows = await q
            .OrderByDescending(a => a.Timestamp)
            .Take(10000)
            .Select(a => new AuditLogEntryDto(
                a.Id, a.Timestamp, a.UserId, a.UserFullName, a.UserRole,
                a.Action, a.EntityType, a.EntityId, a.EntityName,
                a.ProjectId, a.ProjectName, a.Detail))
            .ToListAsync();

        var config = new CsvConfiguration(CultureInfo.InvariantCulture);
        using var ms = new MemoryStream();
        using (var writer = new StreamWriter(ms, Encoding.UTF8, leaveOpen: true))
        using (var csv = new CsvWriter(writer, config))
        {
            csv.WriteRecords(rows);
        }
        ms.Position = 0;
        return File(ms.ToArray(), "text/csv", "audit-log.csv");
    }

    [HttpGet("project/{id:int}")]
    public async Task<ActionResult<IEnumerable<AuditLogEntryDto>>> GetProjectChangelog(int id)
    {
        var items = await _db.AuditLogEntries
            .Where(a => a.ProjectId == id)
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new AuditLogEntryDto(
                a.Id, a.Timestamp, a.UserId, a.UserFullName, a.UserRole,
                a.Action, a.EntityType, a.EntityId, a.EntityName,
                a.ProjectId, a.ProjectName, a.Detail))
            .ToListAsync();

        return Ok(items);
    }
}
