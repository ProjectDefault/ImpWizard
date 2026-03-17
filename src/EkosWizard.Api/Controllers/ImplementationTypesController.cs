using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/implementation-types")]
[Authorize(Roles = "Admin")]
public class ImplementationTypesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public ImplementationTypesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ImplementationTypeDto(int Id, string Name, string? Description, int SortOrder, bool IsActive, int? ProgramId);

    public record CreateImplementationTypeRequest(string Name, string? Description, int SortOrder, int? ProgramId);

    public record UpdateImplementationTypeRequest(string? Name, string? Description, int? SortOrder, bool? IsActive, int? ProgramId);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ImplementationTypeDto ToDto(ImplementationType t) =>
        new(t.Id, t.Name, t.Description, t.SortOrder, t.IsActive, t.ProgramId);

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var types = await _db.ImplementationTypes
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .ToListAsync();

        return Ok(types.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await _db.ImplementationTypes.FirstOrDefaultAsync(t => t.Id == id);
        return t is null ? NotFound() : Ok(ToDto(t));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateImplementationTypeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var t = new ImplementationType
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            ProgramId = req.ProgramId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ImplementationTypes.Add(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "implementation_type.created", "ImplementationType", t.Id.ToString(), t.Name);
        return CreatedAtAction(nameof(GetById), new { id = t.Id }, ToDto(t));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateImplementationTypeRequest req)
    {
        var t = await _db.ImplementationTypes.FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();

        if (req.Name is not null) t.Name = req.Name.Trim();
        if (req.Description is not null) t.Description = req.Description.Trim();
        if (req.SortOrder is not null) t.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) t.IsActive = req.IsActive.Value;
        if (req.ProgramId is not null) t.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;
        t.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "implementation_type.updated", "ImplementationType", t.Id.ToString(), t.Name);
        return Ok(ToDto(t));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var t = await _db.ImplementationTypes.FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();

        var name = t.Name;
        _db.ImplementationTypes.Remove(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "implementation_type.deleted", "ImplementationType", id.ToString(), name);
        return NoContent();
    }
}
