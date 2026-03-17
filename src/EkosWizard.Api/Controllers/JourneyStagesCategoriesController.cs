using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/journey-stage-categories")]
[Authorize(Roles = "Admin,CIS")]
public class JourneyStagesCategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public JourneyStagesCategoriesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record JourneyStageCategoryDto(int Id, string Name, string? Description, int SortOrder, bool IsActive);

    public record CreateJourneyStageCategoryRequest(string Name, string? Description, int SortOrder = 0);

    public record UpdateJourneyStageCategoryRequest(string? Name, string? Description, int? SortOrder, bool? IsActive);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static JourneyStageCategoryDto ToDto(JourneyStageCategory c) =>
        new(c.Id, c.Name, c.Description, c.SortOrder, c.IsActive);

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _db.JourneyStageCategories
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync();

        return Ok(categories.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var c = await _db.JourneyStageCategories.FirstOrDefaultAsync(c => c.Id == id);
        return c is null ? NotFound() : Ok(ToDto(c));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateJourneyStageCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var c = new JourneyStageCategory
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.JourneyStageCategories.Add(c);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey_stage_category.created", "JourneyStageCategory", c.Id.ToString(), c.Name);
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, ToDto(c));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateJourneyStageCategoryRequest req)
    {
        var c = await _db.JourneyStageCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (c is null) return NotFound();

        if (req.Name is not null) c.Name = req.Name.Trim();
        if (req.Description is not null) c.Description = req.Description.Trim();
        if (req.SortOrder is not null) c.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) c.IsActive = req.IsActive.Value;
        c.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey_stage_category.updated", "JourneyStageCategory", c.Id.ToString(), c.Name);
        return Ok(ToDto(c));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var c = await _db.JourneyStageCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (c is null) return NotFound();

        var inUse = await _db.JourneyStages.AnyAsync(s => s.StageCategoryId == id);
        if (inUse)
            return Conflict(new { message = "This category is assigned to one or more stages and cannot be deleted." });

        var name = c.Name;
        _db.JourneyStageCategories.Remove(c);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey_stage_category.deleted", "JourneyStageCategory", id.ToString(), name);
        return NoContent();
    }
}
