using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/reference-data")]
[Authorize(Roles = "Admin,CIS")]
public class ReferenceDataController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public ReferenceDataController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record CategoryRefDto(int Id, string Name);

    public record ProductTypeRefDto(int Id, string Name);

    public record ProgramRefDto(int Id, string Name, string? Color);

    public record DataSetListDto(int Id, string Name, string? Description, bool IsAdminOnly, bool IsActive, int SortOrder, int ItemCount, CategoryRefDto? Category, IEnumerable<ProgramRefDto> Programs);

    public record DataItemDto(int Id, string Label, int SortOrder, bool IsActive, IEnumerable<ProductTypeRefDto> ProductTypes);

    public record DataSetDetailDto(int Id, string Name, string? Description, bool IsAdminOnly, bool IsActive, int SortOrder, CategoryRefDto? Category, IEnumerable<ProgramRefDto> Programs, IEnumerable<ProductTypeRefDto> ProductTypes, IEnumerable<DataItemDto> Items);

    public record CreateDataSetRequest(string Name, string? Description, bool IsAdminOnly, int SortOrder, int[]? ProgramIds);

    public record UpdateDataSetRequest(string? Name, string? Description, bool? IsAdminOnly, bool? IsActive, int? SortOrder);

    public record SetCategoryRequest(int? CategoryId);

    public record CreateItemRequest(string Label, int SortOrder);

    public record UpdateItemRequest(string? Label, int? SortOrder, bool? IsActive);

    // ── Import DTOs ───────────────────────────────────────────────────────────

    public record ImportItemSpec(string Label, int? SortOrder, string[]? ProductTypes);

    public record ImportDataSetSpec(
        string Name, string? Description, bool? IsAdminOnly, int? SortOrder,
        string? Category, string[]? ProductTypes, ImportItemSpec[]? Items);

    public record ImportResultDto(string Name, string Action, int ItemsCreated, int ItemsUpdated, string[] Warnings);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool IsAdmin() => User.IsInRole("Admin");

    private bool CanEdit(ReferenceDataSet ds) => IsAdmin() || !ds.IsAdminOnly;

    private static CategoryRefDto? ToCategoryRef(Category? c) => c is null ? null : new(c.Id, c.Name);

    private static IEnumerable<ProgramRefDto> ToProgramRefs(IEnumerable<ImpWizard.Infrastructure.Data.Program> ps) =>
        ps.OrderBy(p => p.Name).Select(p => new ProgramRefDto(p.Id, p.Name, p.Color));

    private static IEnumerable<ProductTypeRefDto> ToProductTypeRefs(IEnumerable<ProductType> pts) =>
        pts.OrderBy(pt => pt.SortOrder).ThenBy(pt => pt.Name).Select(pt => new ProductTypeRefDto(pt.Id, pt.Name));

    private static DataItemDto ToItemDto(ReferenceDataItem i) =>
        new(i.Id, i.Label, i.SortOrder, i.IsActive, ToProductTypeRefs(i.ProductTypes));

    private static DataSetDetailDto ToDetailDto(ReferenceDataSet ds) => new(
        ds.Id, ds.Name, ds.Description, ds.IsAdminOnly, ds.IsActive, ds.SortOrder,
        ToCategoryRef(ds.Category),
        ToProgramRefs(ds.Programs),
        ToProductTypeRefs(ds.ProductTypes),
        ds.Items.OrderBy(i => i.SortOrder).Select(ToItemDto));

    // ── Dataset Endpoints ─────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sets = await _db.ReferenceDataSets
            .Include(ds => ds.Items)
            .Include(ds => ds.Category)
            .Include(ds => ds.Programs)
            .OrderBy(ds => ds.SortOrder).ThenBy(ds => ds.Name)
            .ToListAsync();

        return Ok(sets.Select(ds => new DataSetListDto(
            ds.Id, ds.Name, ds.Description, ds.IsAdminOnly, ds.IsActive, ds.SortOrder, ds.Items.Count, ToCategoryRef(ds.Category), ToProgramRefs(ds.Programs))));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ds = await _db.ReferenceDataSets
            .Include(ds => ds.Items).ThenInclude(i => i.ProductTypes)
            .Include(ds => ds.Category)
            .Include(ds => ds.Programs)
            .Include(ds => ds.ProductTypes)
            .FirstOrDefaultAsync(ds => ds.Id == id);

        return ds is null ? NotFound() : Ok(ToDetailDto(ds));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDataSetRequest req)
    {
        if (!IsAdmin()) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var ds = new ReferenceDataSet
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            IsAdminOnly = req.IsAdminOnly,
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ReferenceDataSets.Add(ds);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "reference_data.created", "ReferenceDataSet", ds.Id.ToString(), ds.Name);

        if (req.ProgramIds is { Length: > 0 })
        {
            var programs = await _db.Programs.Where(p => req.ProgramIds.Contains(p.Id)).ToListAsync();
            foreach (var p in programs) ds.Programs.Add(p);
            await _db.SaveChangesAsync();
        }

        await _db.Entry(ds).Collection(d => d.Items).LoadAsync();
        await _db.Entry(ds).Reference(d => d.Category).LoadAsync();
        await _db.Entry(ds).Collection(d => d.Programs).LoadAsync();
        await _db.Entry(ds).Collection(d => d.ProductTypes).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = ds.Id }, ToDetailDto(ds));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDataSetRequest req)
    {
        if (!IsAdmin()) return Forbid();

        var ds = await _db.ReferenceDataSets
            .Include(d => d.Items).ThenInclude(i => i.ProductTypes)
            .Include(d => d.Category)
            .Include(d => d.Programs)
            .Include(d => d.ProductTypes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();

        if (req.Name is not null) ds.Name = req.Name.Trim();
        if (req.Description is not null) ds.Description = req.Description.Trim();
        if (req.IsAdminOnly is not null) ds.IsAdminOnly = req.IsAdminOnly.Value;
        if (req.IsActive is not null) ds.IsActive = req.IsActive.Value;
        if (req.SortOrder is not null) ds.SortOrder = req.SortOrder.Value;
        ds.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "reference_data.updated", "ReferenceDataSet", ds.Id.ToString(), ds.Name);
        return Ok(ToDetailDto(ds));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!IsAdmin()) return Forbid();

        var ds = await _db.ReferenceDataSets.FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();

        var name = ds.Name;
        _db.ReferenceDataSets.Remove(ds);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "reference_data.deleted", "ReferenceDataSet", id.ToString(), name);
        return NoContent();
    }

    // ── Item Endpoints ────────────────────────────────────────────────────────

    [HttpPost("{id:int}/items")]
    public async Task<IActionResult> AddItem(int id, [FromBody] CreateItemRequest req)
    {
        var ds = await _db.ReferenceDataSets.Include(d => d.Items).FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        if (!CanEdit(ds)) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { message = "Label is required." });

        var item = new ReferenceDataItem
        {
            DataSetId = id,
            Label = req.Label.Trim(),
            SortOrder = req.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ReferenceDataItems.Add(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "reference_data.created", "ReferenceDataItem", item.Id.ToString(), item.Label);
        await _db.Entry(item).Collection(i => i.ProductTypes).LoadAsync();
        return Ok(ToItemDto(item));
    }

    [HttpPut("{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> UpdateItem(int id, int itemId, [FromBody] UpdateItemRequest req)
    {
        var ds = await _db.ReferenceDataSets.FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        if (!CanEdit(ds)) return Forbid();

        var item = await _db.ReferenceDataItems
            .Include(i => i.ProductTypes)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.DataSetId == id);
        if (item is null) return NotFound();

        if (req.Label is not null) item.Label = req.Label.Trim();
        if (req.SortOrder is not null) item.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) item.IsActive = req.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "reference_data.updated", "ReferenceDataItem", item.Id.ToString(), item.Label);
        return Ok(ToItemDto(item));
    }

    [HttpDelete("{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> DeleteItem(int id, int itemId)
    {
        var ds = await _db.ReferenceDataSets.FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        if (!CanEdit(ds)) return Forbid();

        var item = await _db.ReferenceDataItems.FirstOrDefaultAsync(i => i.Id == itemId && i.DataSetId == id);
        if (item is null) return NotFound();

        var label = item.Label;
        _db.ReferenceDataItems.Remove(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "reference_data.deleted", "ReferenceDataItem", itemId.ToString(), label);
        return NoContent();
    }

    /// <summary>Reorder items by providing the desired item ID sequence. Assigns SortOrder 1, 2, 3...</summary>
    [HttpPut("{id:int}/items/reorder")]
    public async Task<IActionResult> ReorderItems(int id, [FromBody] int[] itemIds)
    {
        var ds = await _db.ReferenceDataSets
            .Include(d => d.Items).ThenInclude(i => i.ProductTypes)
            .Include(d => d.Category)
            .Include(d => d.Programs)
            .Include(d => d.ProductTypes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        if (!CanEdit(ds)) return Forbid();

        var itemIdSet = ds.Items.Select(i => i.Id).ToHashSet();
        if (!itemIds.All(iid => itemIdSet.Contains(iid)))
            return BadRequest(new { message = "One or more item IDs do not belong to this dataset." });

        for (int i = 0; i < itemIds.Length; i++)
        {
            var item = ds.Items.First(x => x.Id == itemIds[i]);
            item.SortOrder = i + 1;
            item.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(ToDetailDto(ds));
    }

    // ── Category Assignment ───────────────────────────────────────────────────

    [HttpPut("{id:int}/category")]
    public async Task<IActionResult> SetCategory(int id, [FromBody] SetCategoryRequest req)
    {
        if (!IsAdmin()) return Forbid();

        var ds = await _db.ReferenceDataSets
            .Include(d => d.Items).ThenInclude(i => i.ProductTypes)
            .Include(d => d.Category)
            .Include(d => d.Programs)
            .Include(d => d.ProductTypes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();

        if (req.CategoryId.HasValue)
        {
            var exists = await _db.Categories.AnyAsync(c => c.Id == req.CategoryId.Value);
            if (!exists) return BadRequest(new { message = "Category not found." });
        }

        ds.CategoryId = req.CategoryId;
        ds.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _db.Entry(ds).Reference(d => d.Category).LoadAsync();

        return Ok(ToDetailDto(ds));
    }

    // ── Program Assignment ────────────────────────────────────────────────────

    [HttpPut("{id:int}/programs")]
    public async Task<IActionResult> SetPrograms(int id, [FromBody] int[] programIds)
    {
        if (!IsAdmin()) return Forbid();

        var ds = await _db.ReferenceDataSets
            .Include(d => d.Items).ThenInclude(i => i.ProductTypes)
            .Include(d => d.Category)
            .Include(d => d.Programs)
            .Include(d => d.ProductTypes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();

        var programs = await _db.Programs.Where(p => programIds.Contains(p.Id)).ToListAsync();

        ds.Programs.Clear();
        foreach (var p in programs) ds.Programs.Add(p);

        ds.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDetailDto(ds));
    }

    // ── Product Type Assignment ───────────────────────────────────────────────

    [HttpPut("{id:int}/product-types")]
    public async Task<IActionResult> SetDataSetProductTypes(int id, [FromBody] int[] productTypeIds)
    {
        var ds = await _db.ReferenceDataSets
            .Include(d => d.Items).ThenInclude(i => i.ProductTypes)
            .Include(d => d.Category)
            .Include(d => d.Programs)
            .Include(d => d.ProductTypes)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        if (!CanEdit(ds)) return Forbid();

        var productTypes = await _db.ProductTypes
            .Where(pt => productTypeIds.Contains(pt.Id))
            .ToListAsync();

        ds.ProductTypes.Clear();
        foreach (var pt in productTypes)
            ds.ProductTypes.Add(pt);

        ds.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDetailDto(ds));
    }

    [HttpPut("{id:int}/items/{itemId:int}/product-types")]
    public async Task<IActionResult> SetItemProductTypes(int id, int itemId, [FromBody] int[] productTypeIds)
    {
        var ds = await _db.ReferenceDataSets.FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        if (!CanEdit(ds)) return Forbid();

        var item = await _db.ReferenceDataItems
            .Include(i => i.ProductTypes)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.DataSetId == id);
        if (item is null) return NotFound();

        var productTypes = await _db.ProductTypes
            .Where(pt => productTypeIds.Contains(pt.Id))
            .ToListAsync();

        item.ProductTypes.Clear();
        foreach (var pt in productTypes)
            item.ProductTypes.Add(pt);

        item.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToItemDto(item));
    }

    // ── Import ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Upsert datasets by name. Items are upserted by label within each dataset.
    /// Category and ProductTypes are matched by name (case-insensitive).
    /// Omit a field to leave it unchanged on update.
    /// ProductTypes: null = don't touch, [] = clear all, ["X"] = replace.
    /// Category: null = don't touch, "" = clear, "Name" = assign.
    /// </summary>
    [HttpPost("import")]
    public async Task<IActionResult> ImportDataSets([FromBody] ImportDataSetSpec[] specs)
    {
        if (!IsAdmin()) return Forbid();
        if (specs is null || specs.Length == 0)
            return BadRequest(new { message = "No datasets provided." });

        var allCategories = await _db.Categories.ToListAsync();
        var allProductTypes = await _db.ProductTypes.ToListAsync();
        var categoryByName = allCategories.ToDictionary(c => c.Name.ToLowerInvariant());
        var productTypeByName = allProductTypes.ToDictionary(pt => pt.Name.ToLowerInvariant());

        var results = new List<ImportResultDto>();

        foreach (var spec in specs)
        {
            if (string.IsNullOrWhiteSpace(spec.Name))
            {
                results.Add(new ImportResultDto("(unnamed)", "skipped", 0, 0, ["Name is required — skipped."]));
                continue;
            }

            var warnings = new List<string>();
            int itemsCreated = 0, itemsUpdated = 0;

            var ds = await _db.ReferenceDataSets
                .Include(d => d.Items).ThenInclude(i => i.ProductTypes)
                .Include(d => d.ProductTypes)
                .FirstOrDefaultAsync(d => d.Name.ToLower() == spec.Name.ToLowerInvariant());

            string action;
            if (ds is null)
            {
                ds = new ReferenceDataSet
                {
                    Name = spec.Name.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.ReferenceDataSets.Add(ds);
                action = "created";
            }
            else
            {
                action = "updated";
            }

            if (spec.Description is not null) ds.Description = spec.Description.Trim();
            if (spec.IsAdminOnly is not null) ds.IsAdminOnly = spec.IsAdminOnly.Value;
            if (spec.SortOrder is not null) ds.SortOrder = spec.SortOrder.Value;
            ds.UpdatedAt = DateTime.UtcNow;

            if (spec.Category is not null)
            {
                if (spec.Category == "")
                {
                    ds.CategoryId = null;
                }
                else if (categoryByName.TryGetValue(spec.Category.ToLowerInvariant(), out var cat))
                {
                    ds.CategoryId = cat.Id;
                }
                else
                {
                    warnings.Add($"Category '{spec.Category}' not found — skipped.");
                }
            }

            await _db.SaveChangesAsync();

            if (spec.ProductTypes is not null)
            {
                ds.ProductTypes.Clear();
                foreach (var ptName in spec.ProductTypes)
                {
                    if (productTypeByName.TryGetValue(ptName.ToLowerInvariant(), out var pt))
                        ds.ProductTypes.Add(pt);
                    else
                        warnings.Add($"Product type '{ptName}' not found — skipped.");
                }
                await _db.SaveChangesAsync();
            }

            if (spec.Items is not null)
            {
                var itemsInMemory = ds.Items.ToList();
                foreach (var itemSpec in spec.Items)
                {
                    if (string.IsNullOrWhiteSpace(itemSpec.Label)) continue;

                    var item = itemsInMemory.FirstOrDefault(i =>
                        i.Label.ToLowerInvariant() == itemSpec.Label.ToLowerInvariant());

                    if (item is null)
                    {
                        item = new ReferenceDataItem
                        {
                            DataSetId = ds.Id,
                            Label = itemSpec.Label.Trim(),
                            SortOrder = itemSpec.SortOrder ?? (itemsInMemory.Count + 1),
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                        };
                        _db.ReferenceDataItems.Add(item);
                        await _db.SaveChangesAsync();
                        await _db.Entry(item).Collection(i => i.ProductTypes).LoadAsync();
                        itemsInMemory.Add(item);
                        itemsCreated++;
                    }
                    else
                    {
                        if (itemSpec.SortOrder is not null) item.SortOrder = itemSpec.SortOrder.Value;
                        item.UpdatedAt = DateTime.UtcNow;
                        itemsUpdated++;
                    }

                    if (itemSpec.ProductTypes is not null)
                    {
                        item.ProductTypes.Clear();
                        foreach (var ptName in itemSpec.ProductTypes)
                        {
                            if (productTypeByName.TryGetValue(ptName.ToLowerInvariant(), out var pt))
                                item.ProductTypes.Add(pt);
                            else
                                warnings.Add($"Item '{itemSpec.Label}': product type '{ptName}' not found — skipped.");
                        }
                    }
                }
                await _db.SaveChangesAsync();
            }

            results.Add(new ImportResultDto(spec.Name, action, itemsCreated, itemsUpdated, [.. warnings]));
        }

        return Ok(new { results });
    }
}
