using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/resource-catalog")]
[Authorize(Roles = "Admin,CIS")]
public class ResourceCatalogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public ResourceCatalogController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ResourceCatalogEntryDto(
        int Id, string Title, string? ResourceType, string? ResourceUrl, string? ResourceLabel,
        string? Description, int SortOrder, bool IsActive);

    public record CreateResourceCatalogEntryRequest(
        string Title, string? ResourceType, string? ResourceUrl, string? ResourceLabel,
        string? Description, int SortOrder = 0);

    public record UpdateResourceCatalogEntryRequest(
        string? Title, string? ResourceType, string? ResourceUrl, string? ResourceLabel,
        string? Description, int? SortOrder, bool? IsActive);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ResourceCatalogEntryDto ToDto(ResourceCatalogEntry e) =>
        new(e.Id, e.Title, e.ResourceType, e.ResourceUrl, e.ResourceLabel,
            e.Description, e.SortOrder, e.IsActive);

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entries = await _db.ResourceCatalogEntries
            .OrderBy(e => e.SortOrder)
            .ThenBy(e => e.Title)
            .ToListAsync();

        return Ok(entries.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var e = await _db.ResourceCatalogEntries.FirstOrDefaultAsync(e => e.Id == id);
        return e is null ? NotFound() : Ok(ToDto(e));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateResourceCatalogEntryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { message = "Title is required." });

        var entry = new ResourceCatalogEntry
        {
            Title = req.Title.Trim(),
            ResourceType = req.ResourceType?.Trim(),
            ResourceUrl = req.ResourceUrl?.Trim(),
            ResourceLabel = req.ResourceLabel?.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ResourceCatalogEntries.Add(entry);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "resource_catalog.created", "ResourceCatalogEntry", entry.Id.ToString(), entry.Title);
        return CreatedAtAction(nameof(GetById), new { id = entry.Id }, ToDto(entry));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateResourceCatalogEntryRequest req)
    {
        var entry = await _db.ResourceCatalogEntries.FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();

        if (req.Title is not null) entry.Title = req.Title.Trim();
        if (req.ResourceType is not null) entry.ResourceType = req.ResourceType.Trim();
        if (req.ResourceUrl is not null) entry.ResourceUrl = req.ResourceUrl.Trim();
        if (req.ResourceLabel is not null) entry.ResourceLabel = req.ResourceLabel.Trim();
        if (req.Description is not null) entry.Description = req.Description.Trim();
        if (req.SortOrder is not null) entry.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) entry.IsActive = req.IsActive.Value;
        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "resource_catalog.updated", "ResourceCatalogEntry", entry.Id.ToString(), entry.Title);
        return Ok(ToDto(entry));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var entry = await _db.ResourceCatalogEntries.FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();

        var title = entry.Title;
        _db.ResourceCatalogEntries.Remove(entry);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "resource_catalog.deleted", "ResourceCatalogEntry", id.ToString(), title);
        return NoContent();
    }
}
