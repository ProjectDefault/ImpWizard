using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/product-types")]
[Authorize(Roles = "Admin")]
public class ProductTypesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public ProductTypesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ProductTypeListDto(int Id, string Name, string? Description, int SortOrder, int DataSetCount, int ItemCount);

    public record DataSetSummaryDto(int Id, string Name);

    public record ItemAssignmentDto(int ItemId, string Label, int DataSetId, string DataSetName);

    public record ProductTypeDetailDto(int Id, string Name, string? Description, int SortOrder,
        IEnumerable<DataSetSummaryDto> DataSets, IEnumerable<ItemAssignmentDto> Items);

    public record CreateProductTypeRequest(string Name, string? Description, int SortOrder);

    public record UpdateProductTypeRequest(string? Name, string? Description, int? SortOrder);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ProductTypeDetailDto ToDetailDto(ProductType pt) => new(
        pt.Id, pt.Name, pt.Description, pt.SortOrder,
        pt.DataSets.OrderBy(ds => ds.Name).Select(ds => new DataSetSummaryDto(ds.Id, ds.Name)),
        pt.Items.OrderBy(i => i.DataSet.Name).ThenBy(i => i.SortOrder)
                .Select(i => new ItemAssignmentDto(i.Id, i.Label, i.DataSetId, i.DataSet.Name)));

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var pts = await _db.ProductTypes
            .Include(pt => pt.DataSets)
            .Include(pt => pt.Items)
            .OrderBy(pt => pt.SortOrder).ThenBy(pt => pt.Name)
            .ToListAsync();

        return Ok(pts.Select(pt => new ProductTypeListDto(
            pt.Id, pt.Name, pt.Description, pt.SortOrder, pt.DataSets.Count, pt.Items.Count)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var pt = await _db.ProductTypes
            .Include(pt => pt.DataSets)
            .Include(pt => pt.Items).ThenInclude(i => i.DataSet)
            .FirstOrDefaultAsync(pt => pt.Id == id);

        return pt is null ? NotFound() : Ok(ToDetailDto(pt));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductTypeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var pt = new ProductType
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ProductTypes.Add(pt);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "product_type.created", "ProductType", pt.Id.ToString(), pt.Name);
        await _db.Entry(pt).Collection(p => p.DataSets).LoadAsync();
        await _db.Entry(pt).Collection(p => p.Items).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = pt.Id }, ToDetailDto(pt));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductTypeRequest req)
    {
        var pt = await _db.ProductTypes
            .Include(p => p.DataSets)
            .Include(p => p.Items).ThenInclude(i => i.DataSet)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (pt is null) return NotFound();

        if (req.Name is not null) pt.Name = req.Name.Trim();
        if (req.Description is not null) pt.Description = req.Description.Trim();
        if (req.SortOrder is not null) pt.SortOrder = req.SortOrder.Value;
        pt.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "product_type.updated", "ProductType", pt.Id.ToString(), pt.Name);
        return Ok(ToDetailDto(pt));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var pt = await _db.ProductTypes.FirstOrDefaultAsync(p => p.Id == id);
        if (pt is null) return NotFound();

        var name = pt.Name;
        _db.ProductTypes.Remove(pt);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "product_type.deleted", "ProductType", id.ToString(), name);
        return NoContent();
    }
}
