using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize(Roles = "Admin")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public CategoriesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ProgramRefDto(int Id, string Name, string? Color);

    public record CategoryListDto(int Id, string Name, string? Description, int SortOrder, int DataSetCount, ProgramRefDto? Program);

    public record DataSetSummaryDto(int Id, string Name);

    public record CategoryDetailDto(int Id, string Name, string? Description, int SortOrder, ProgramRefDto? Program, IEnumerable<DataSetSummaryDto> DataSets);

    public record CreateCategoryRequest(string Name, string? Description, int SortOrder, int? ProgramId);

    public record UpdateCategoryRequest(string? Name, string? Description, int? SortOrder, int? ProgramId);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ProgramRefDto? ToProgramRef(ImpWizard.Infrastructure.Data.Program? p) =>
        p is null ? null : new(p.Id, p.Name, p.Color);

    private static CategoryDetailDto ToDetailDto(Category c) => new(
        c.Id, c.Name, c.Description, c.SortOrder, ToProgramRef(c.Program),
        c.DataSets.OrderBy(ds => ds.Name).Select(ds => new DataSetSummaryDto(ds.Id, ds.Name)));

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cats = await _db.Categories
            .Include(c => c.DataSets)
            .Include(c => c.Program)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync();

        return Ok(cats.Select(c => new CategoryListDto(c.Id, c.Name, c.Description, c.SortOrder, c.DataSets.Count, ToProgramRef(c.Program))));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var cat = await _db.Categories
            .Include(c => c.DataSets)
            .Include(c => c.Program)
            .FirstOrDefaultAsync(c => c.Id == id);

        return cat is null ? NotFound() : Ok(ToDetailDto(cat));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var cat = new Category
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            ProgramId = req.ProgramId == 0 ? null : req.ProgramId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Categories.Add(cat);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "category.created", "Category", cat.Id.ToString(), cat.Name);
        await _db.Entry(cat).Collection(c => c.DataSets).LoadAsync();
        await _db.Entry(cat).Reference(c => c.Program).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = cat.Id }, ToDetailDto(cat));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest req)
    {
        var cat = await _db.Categories.Include(c => c.DataSets).Include(c => c.Program).FirstOrDefaultAsync(c => c.Id == id);
        if (cat is null) return NotFound();

        if (req.Name is not null) cat.Name = req.Name.Trim();
        if (req.Description is not null) cat.Description = req.Description.Trim();
        if (req.SortOrder is not null) cat.SortOrder = req.SortOrder.Value;
        if (req.ProgramId is not null) cat.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;
        cat.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "category.updated", "Category", cat.Id.ToString(), cat.Name);
        await _db.Entry(cat).Reference(c => c.Program).LoadAsync();
        return Ok(ToDetailDto(cat));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var cat = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id);
        if (cat is null) return NotFound();

        var name = cat.Name;
        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "category.deleted", "Category", id.ToString(), name);
        return NoContent();
    }
}
