using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/item-categories")]
[Authorize(Roles = "Admin,CIS")]
public class ItemCategoriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ItemCategoriesController(AppDbContext db)
    {
        _db = db;
    }

    public record ItemCategoryDto(int Id, string Name, string? Description, int SortOrder, bool IsActive);
    public record CreateItemCategoryRequest(string Name, string? Description, int SortOrder = 0);
    public record UpdateItemCategoryRequest(string? Name, string? Description, int? SortOrder, bool? IsActive);

    private static ItemCategoryDto ToDto(ItemCategory ic) =>
        new(ic.Id, ic.Name, ic.Description, ic.SortOrder, ic.IsActive);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _db.ItemCategories
            .OrderBy(ic => ic.SortOrder)
            .ThenBy(ic => ic.Name)
            .ToListAsync();
        return Ok(items.Select(ToDto));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateItemCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var ic = new ItemCategory
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.ItemCategories.Add(ic);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = ic.Id }, ToDto(ic));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateItemCategoryRequest req)
    {
        var ic = await _db.ItemCategories.FindAsync(id);
        if (ic is null) return NotFound();

        if (req.Name is not null) ic.Name = req.Name.Trim();
        if (req.Description is not null) ic.Description = req.Description.Trim();
        if (req.SortOrder is not null) ic.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) ic.IsActive = req.IsActive.Value;
        ic.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ToDto(ic));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var ic = await _db.ItemCategories
            .Include(c => c.CatalogItems)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (ic is null) return NotFound();

        if (ic.CatalogItems.Count > 0)
            return BadRequest(new { message = $"Cannot delete: {ic.CatalogItems.Count} catalog item(s) use this category." });

        _db.ItemCategories.Remove(ic);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
