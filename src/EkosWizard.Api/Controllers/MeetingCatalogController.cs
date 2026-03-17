using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/meeting-catalog")]
[Authorize(Roles = "Admin,CIS")]
public class MeetingCatalogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public MeetingCatalogController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record MeetingCatalogEntryDto(
        int Id, string Title, string? MeetingType, string? Purpose, string? Goals,
        int? DefaultDurationMinutes, string? Description, int SortOrder, bool IsActive);

    public record CreateMeetingCatalogEntryRequest(
        string Title, string? MeetingType, string? Purpose, string? Goals,
        int? DefaultDurationMinutes, string? Description, int SortOrder = 0);

    public record UpdateMeetingCatalogEntryRequest(
        string? Title, string? MeetingType, string? Purpose, string? Goals,
        int? DefaultDurationMinutes, string? Description, int? SortOrder, bool? IsActive);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static MeetingCatalogEntryDto ToDto(MeetingCatalogEntry e) =>
        new(e.Id, e.Title, e.MeetingType, e.Purpose, e.Goals, e.DefaultDurationMinutes,
            e.Description, e.SortOrder, e.IsActive);

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entries = await _db.MeetingCatalogEntries
            .OrderBy(e => e.SortOrder)
            .ThenBy(e => e.Title)
            .ToListAsync();

        return Ok(entries.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var e = await _db.MeetingCatalogEntries.FirstOrDefaultAsync(e => e.Id == id);
        return e is null ? NotFound() : Ok(ToDto(e));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMeetingCatalogEntryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { message = "Title is required." });

        var entry = new MeetingCatalogEntry
        {
            Title = req.Title.Trim(),
            MeetingType = req.MeetingType?.Trim(),
            Purpose = req.Purpose?.Trim(),
            Goals = req.Goals?.Trim(),
            DefaultDurationMinutes = req.DefaultDurationMinutes,
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.MeetingCatalogEntries.Add(entry);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "meeting_catalog.created", "MeetingCatalogEntry", entry.Id.ToString(), entry.Title);
        return CreatedAtAction(nameof(GetById), new { id = entry.Id }, ToDto(entry));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMeetingCatalogEntryRequest req)
    {
        var entry = await _db.MeetingCatalogEntries.FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();

        if (req.Title is not null) entry.Title = req.Title.Trim();
        if (req.MeetingType is not null) entry.MeetingType = req.MeetingType.Trim();
        if (req.Purpose is not null) entry.Purpose = req.Purpose.Trim();
        if (req.Goals is not null) entry.Goals = req.Goals.Trim();
        if (req.DefaultDurationMinutes is not null) entry.DefaultDurationMinutes = req.DefaultDurationMinutes;
        if (req.Description is not null) entry.Description = req.Description.Trim();
        if (req.SortOrder is not null) entry.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) entry.IsActive = req.IsActive.Value;
        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "meeting_catalog.updated", "MeetingCatalogEntry", entry.Id.ToString(), entry.Title);
        return Ok(ToDto(entry));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var entry = await _db.MeetingCatalogEntries.FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();

        var title = entry.Title;
        _db.MeetingCatalogEntries.Remove(entry);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "meeting_catalog.deleted", "MeetingCatalogEntry", id.ToString(), title);
        return NoContent();
    }
}
