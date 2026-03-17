using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/meeting-types")]
[Authorize(Roles = "Admin,CIS")]
public class MeetingTypesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public MeetingTypesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record MeetingTypeDto(int Id, string Name, int SortOrder, bool IsActive);

    public record CreateMeetingTypeRequest(string Name, int SortOrder = 0);

    public record UpdateMeetingTypeRequest(string? Name, int? SortOrder, bool? IsActive);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static MeetingTypeDto ToDto(MeetingType t) =>
        new(t.Id, t.Name, t.SortOrder, t.IsActive);

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var types = await _db.MeetingTypes
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .ToListAsync();

        return Ok(types.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await _db.MeetingTypes.FirstOrDefaultAsync(t => t.Id == id);
        return t is null ? NotFound() : Ok(ToDto(t));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMeetingTypeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var t = new MeetingType
        {
            Name = req.Name.Trim(),
            SortOrder = req.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.MeetingTypes.Add(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "meeting_type.created", "MeetingType", t.Id.ToString(), t.Name);
        return CreatedAtAction(nameof(GetById), new { id = t.Id }, ToDto(t));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMeetingTypeRequest req)
    {
        var t = await _db.MeetingTypes.FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();

        if (req.Name is not null) t.Name = req.Name.Trim();
        if (req.SortOrder is not null) t.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) t.IsActive = req.IsActive.Value;
        t.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "meeting_type.updated", "MeetingType", t.Id.ToString(), t.Name);
        return Ok(ToDto(t));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var t = await _db.MeetingTypes.FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();

        var name = t.Name;
        _db.MeetingTypes.Remove(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "meeting_type.deleted", "MeetingType", id.ToString(), name);
        return NoContent();
    }
}
