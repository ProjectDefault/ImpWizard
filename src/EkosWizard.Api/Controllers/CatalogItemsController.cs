using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/catalog")]
[Authorize(Roles = "Admin,CIS")]
public class CatalogItemsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public CatalogItemsController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ProductTypeRefDto(int Id, string Name);
    public record CategoryRefDto(int Id, string Name);

    public record CatalogItemListDto(
        int Id, string ItemName, string DisplayLabel, bool IsActive, int SortOrder,
        int? CatalogItemTypeId, string? CatalogItemTypeName,
        int? CatalogItemSubTypeId, string? CatalogItemSubTypeName,
        string? Supplier, string? Vendor, string? VendorItemNumber,
        string? PurchaseUomDescription, decimal? PurchaseAmountPerUom,
        string? PurchaseUomName, string? PurchaseUomAbbreviation, string? UomType,
        string? ProgramName, string? ProgramColor,
        IEnumerable<string> ProductTypes,
        IEnumerable<string> Categories);

    public record FieldValueDto(int FieldId, string FieldName, string FieldLabel, string FieldType, bool IsRequired, string? Value);
    public record FieldValueEntry(int FieldId, string? Value);
    public record SetFieldValuesRequest(IEnumerable<FieldValueEntry> Values);

    public record CatalogItemDetailDto(
        int Id, string ItemName, string DisplayLabel, bool IsActive, int SortOrder,
        int? CatalogItemTypeId, string? CatalogItemTypeName,
        int? CatalogItemSubTypeId, string? CatalogItemSubTypeName,
        int? ProgramId, string? ProgramName, string? ProgramColor,
        int? SupplierId, string? SupplierName,
        int? VendorId, string? VendorName,
        string? VendorItemNumber,
        string? PurchaseUomDescription, decimal? PurchaseAmountPerUom,
        int? PurchaseUomId, string? PurchaseUomName, string? PurchaseUomAbbreviation, string? UomType,
        IEnumerable<ProductTypeRefDto> ProductTypes,
        IEnumerable<CategoryRefDto> Categories,
        IEnumerable<FieldValueDto> FieldValues);

    public record PagedResult<T>(IEnumerable<T> Items, int TotalCount, int Page, int PageSize);

    public record CreateCatalogItemRequest(
        string ItemName,
        int? ProgramId,
        int? SupplierId,
        int? VendorId,
        string? VendorItemNumber,
        string? PurchaseUomDescription,
        decimal? PurchaseAmountPerUom,
        int? PurchaseUomId,
        int? CatalogItemTypeId,
        int? CatalogItemSubTypeId,
        int SortOrder = 0);

    public record UpdateCatalogItemRequest(
        string? ItemName,
        bool? IsActive,
        int? ProgramId,
        int? SupplierId,
        int? VendorId,
        string? VendorItemNumber,
        string? PurchaseUomDescription,
        decimal? PurchaseAmountPerUom,
        int? PurchaseUomId,
        int? CatalogItemTypeId,
        int? CatalogItemSubTypeId,
        int? SortOrder);

    public record BulkUpdateRequest(
        int[] ItemIds,
        int? ProgramId,       // null = no change; 0 = clear
        int? SupplierId,
        int? VendorId,
        bool? IsActive,
        int[]? ProductTypeIds,  // null = no change; [] = clear all
        int[]? CategoryIds);    // null = no change; [] = clear all

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string ComputeDisplayLabel(CatalogItem ci) =>
        ci.CatalogItemSubType is not null
            ? $"{ci.ItemName}: {ci.CatalogItemSubType.Name}"
            : ci.ItemName;

    private static CatalogItemListDto ToListDto(CatalogItem ci) => new(
        ci.Id, ci.ItemName, ComputeDisplayLabel(ci), ci.IsActive, ci.SortOrder,
        ci.CatalogItemTypeId, ci.CatalogItemType?.Name,
        ci.CatalogItemSubTypeId, ci.CatalogItemSubType?.Name,
        ci.Supplier?.Name,
        ci.Vendor?.Name,
        ci.VendorItemNumber,
        ci.PurchaseUomDescription,
        ci.PurchaseAmountPerUom,
        ci.PurchaseUom?.Name,
        ci.PurchaseUom?.Abbreviation,
        ci.PurchaseUom?.UnitCategory,
        ci.Program?.Name,
        ci.Program?.Color,
        ci.ProductTypes.Select(pt => pt.Name),
        ci.Categories.Select(c => c.Name));

    private static CatalogItemDetailDto ToDetailDto(CatalogItem ci)
    {
        // Build field values: all active fields on the type, merged with stored values
        var fieldValues = Enumerable.Empty<FieldValueDto>();
        if (ci.CatalogItemType?.Fields is not null)
        {
            fieldValues = ci.CatalogItemType.Fields
                .Where(f => f.IsActive)
                .OrderBy(f => f.SortOrder).ThenBy(f => f.FieldName)
                .Select(f =>
                {
                    var stored = ci.FieldValues.FirstOrDefault(v => v.CatalogItemTypeFieldId == f.Id);
                    return new FieldValueDto(f.Id, f.FieldName, f.FieldLabel, f.FieldType, f.IsRequired, stored?.Value);
                });
        }

        return new CatalogItemDetailDto(
            ci.Id, ci.ItemName, ComputeDisplayLabel(ci), ci.IsActive, ci.SortOrder,
            ci.CatalogItemTypeId, ci.CatalogItemType?.Name,
            ci.CatalogItemSubTypeId, ci.CatalogItemSubType?.Name,
            ci.ProgramId, ci.Program?.Name, ci.Program?.Color,
            ci.SupplierId, ci.Supplier?.Name,
            ci.VendorId, ci.Vendor?.Name,
            ci.VendorItemNumber,
            ci.PurchaseUomDescription, ci.PurchaseAmountPerUom,
            ci.PurchaseUomId, ci.PurchaseUom?.Name, ci.PurchaseUom?.Abbreviation, ci.PurchaseUom?.UnitCategory,
            ci.ProductTypes.Select(pt => new ProductTypeRefDto(pt.Id, pt.Name)),
            ci.Categories.Select(c => new CategoryRefDto(c.Id, c.Name)),
            fieldValues);
    }

    // Lightweight query for list/export — no field value joins
    private IQueryable<CatalogItem> BuildQuery() =>
        _db.CatalogItems
            .Include(ci => ci.Program)
            .Include(ci => ci.Supplier)
            .Include(ci => ci.Vendor)
            .Include(ci => ci.PurchaseUom)
            .Include(ci => ci.ProductTypes)
            .Include(ci => ci.Categories)
            .Include(ci => ci.CatalogItemType)
            .Include(ci => ci.CatalogItemSubType);

    // Full query for single-item detail — includes type fields + stored values
    private IQueryable<CatalogItem> BuildDetailQuery() =>
        _db.CatalogItems
            .Include(ci => ci.Program)
            .Include(ci => ci.Supplier)
            .Include(ci => ci.Vendor)
            .Include(ci => ci.PurchaseUom)
            .Include(ci => ci.ProductTypes)
            .Include(ci => ci.Categories)
            .Include(ci => ci.CatalogItemType)
                .ThenInclude(t => t!.Fields.OrderBy(f => f.SortOrder))
            .Include(ci => ci.CatalogItemSubType)
            .Include(ci => ci.FieldValues)
                .ThenInclude(v => v.CatalogItemTypeField);

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? programId,
        [FromQuery] int? categoryId,
        [FromQuery] int? supplierId,
        [FromQuery] int? vendorId,
        [FromQuery] int? productTypeId,
        [FromQuery] int? catalogItemTypeId,
        [FromQuery] int? catalogItemSubTypeId,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        pageSize = Math.Clamp(pageSize, 1, 200);
        page = Math.Max(1, page);

        var query = BuildQuery().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(ci => ci.ItemName.Contains(search));
        if (isActive.HasValue)
            query = query.Where(ci => ci.IsActive == isActive.Value);
        else
            query = query.Where(ci => ci.IsActive);
        if (programId.HasValue)
            query = query.Where(ci => ci.ProgramId == programId.Value);
        if (categoryId.HasValue)
            query = query.Where(ci => ci.Categories.Any(c => c.Id == categoryId.Value));
        if (supplierId.HasValue)
            query = query.Where(ci => ci.SupplierId == supplierId.Value);
        if (vendorId.HasValue)
            query = query.Where(ci => ci.VendorId == vendorId.Value);
        if (productTypeId.HasValue)
            query = query.Where(ci => ci.ProductTypes.Any(pt => pt.Id == productTypeId.Value));
        if (catalogItemTypeId.HasValue)
            query = query.Where(ci => ci.CatalogItemTypeId == catalogItemTypeId.Value);
        if (catalogItemSubTypeId.HasValue)
            query = query.Where(ci => ci.CatalogItemSubTypeId == catalogItemSubTypeId.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(ci => ci.ItemName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<CatalogItemListDto>(items.Select(ToListDto), totalCount, page, pageSize));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ci = await BuildDetailQuery().FirstOrDefaultAsync(ci => ci.Id == id);
        return ci is null ? NotFound() : Ok(ToDetailDto(ci));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCatalogItemRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ItemName))
            return BadRequest(new { message = "ItemName is required." });

        var ci = new CatalogItem
        {
            ItemName = req.ItemName.Trim(),
            ProgramId = req.ProgramId == 0 ? null : req.ProgramId,
            SupplierId = req.SupplierId == 0 ? null : req.SupplierId,
            VendorId = req.VendorId == 0 ? null : req.VendorId,
            VendorItemNumber = req.VendorItemNumber?.Trim(),
            PurchaseUomDescription = req.PurchaseUomDescription?.Trim(),
            PurchaseAmountPerUom = req.PurchaseAmountPerUom,
            PurchaseUomId = req.PurchaseUomId == 0 ? null : req.PurchaseUomId,
            CatalogItemTypeId = req.CatalogItemTypeId == 0 ? null : req.CatalogItemTypeId,
            CatalogItemSubTypeId = req.CatalogItemSubTypeId == 0 ? null : req.CatalogItemSubTypeId,
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.CatalogItems.Add(ci);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item.created", "CatalogItem", ci.Id.ToString(), ci.ItemName);

        var result = await BuildDetailQuery().FirstAsync(x => x.Id == ci.Id);
        return CreatedAtAction(nameof(GetById), new { id = ci.Id }, ToDetailDto(result));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCatalogItemRequest req)
    {
        var ci = await BuildDetailQuery().FirstOrDefaultAsync(ci => ci.Id == id);
        if (ci is null) return NotFound();

        if (req.ItemName is not null) ci.ItemName = req.ItemName.Trim();
        if (req.IsActive is not null) ci.IsActive = req.IsActive.Value;
        if (req.ProgramId is not null) ci.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;
        if (req.SupplierId is not null) ci.SupplierId = req.SupplierId == 0 ? null : req.SupplierId;
        if (req.VendorId is not null) ci.VendorId = req.VendorId == 0 ? null : req.VendorId;
        if (req.VendorItemNumber is not null) ci.VendorItemNumber = req.VendorItemNumber.Trim();
        if (req.PurchaseUomDescription is not null) ci.PurchaseUomDescription = req.PurchaseUomDescription.Trim();
        if (req.PurchaseAmountPerUom is not null) ci.PurchaseAmountPerUom = req.PurchaseAmountPerUom;
        if (req.PurchaseUomId is not null) ci.PurchaseUomId = req.PurchaseUomId == 0 ? null : req.PurchaseUomId;
        if (req.CatalogItemTypeId is not null) ci.CatalogItemTypeId = req.CatalogItemTypeId == 0 ? null : req.CatalogItemTypeId;
        if (req.CatalogItemSubTypeId is not null) ci.CatalogItemSubTypeId = req.CatalogItemSubTypeId == 0 ? null : req.CatalogItemSubTypeId;
        if (req.SortOrder is not null) ci.SortOrder = req.SortOrder.Value;
        ci.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item.updated", "CatalogItem", ci.Id.ToString(), ci.ItemName);
        var result = await BuildDetailQuery().FirstAsync(x => x.Id == id);
        return Ok(ToDetailDto(result));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var ci = await _db.CatalogItems.FindAsync(id);
        if (ci is null) return NotFound();
        var name = ci.ItemName;
        _db.CatalogItems.Remove(ci);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item.deleted", "CatalogItem", id.ToString(), name);
        return NoContent();
    }

    // ── Product Types ─────────────────────────────────────────────────────────

    [HttpPut("{id:int}/product-types")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetProductTypes(int id, [FromBody] int[] productTypeIds)
    {
        var ci = await _db.CatalogItems.Include(ci => ci.ProductTypes).FirstOrDefaultAsync(ci => ci.Id == id);
        if (ci is null) return NotFound();

        var productTypes = await _db.ProductTypes.Where(pt => productTypeIds.Contains(pt.Id)).ToListAsync();
        ci.ProductTypes.Clear();
        foreach (var pt in productTypes) ci.ProductTypes.Add(pt);
        ci.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var result = await BuildDetailQuery().FirstAsync(x => x.Id == id);
        return Ok(ToDetailDto(result));
    }

    // ── Categories ────────────────────────────────────────────────────────────

    [HttpPut("{id:int}/categories")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetCategories(int id, [FromBody] int[] categoryIds)
    {
        var ci = await _db.CatalogItems.Include(ci => ci.Categories).FirstOrDefaultAsync(ci => ci.Id == id);
        if (ci is null) return NotFound();

        var categories = await _db.ItemCategories.Where(c => categoryIds.Contains(c.Id)).ToListAsync();
        ci.Categories.Clear();
        foreach (var c in categories) ci.Categories.Add(c);
        ci.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var result = await BuildDetailQuery().FirstAsync(x => x.Id == id);
        return Ok(ToDetailDto(result));
    }

    // ── Field Values ──────────────────────────────────────────────────────────

    [HttpPut("{id:int}/field-values")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetFieldValues(int id, [FromBody] SetFieldValuesRequest req)
    {
        var ci = await _db.CatalogItems
            .Include(x => x.CatalogItemType).ThenInclude(t => t!.Fields)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (ci is null) return NotFound();

        var allowedFieldIds = ci.CatalogItemType?.Fields
            .Where(f => f.IsActive)
            .Select(f => f.Id)
            .ToHashSet() ?? [];

        foreach (var entry in req.Values)
        {
            if (!allowedFieldIds.Contains(entry.FieldId))
                return BadRequest(new { message = $"FieldId {entry.FieldId} does not belong to this item's active type fields." });
        }

        // Replace all values scoped to this type's active fields
        var existing = await _db.CatalogItemFieldValues
            .Where(v => v.CatalogItemId == id && allowedFieldIds.Contains(v.CatalogItemTypeFieldId))
            .ToListAsync();
        _db.CatalogItemFieldValues.RemoveRange(existing);

        foreach (var entry in req.Values)
        {
            if (!string.IsNullOrWhiteSpace(entry.Value))
            {
                _db.CatalogItemFieldValues.Add(new CatalogItemFieldValue
                {
                    CatalogItemId = id,
                    CatalogItemTypeFieldId = entry.FieldId,
                    Value = entry.Value.Trim(),
                });
            }
        }

        ci.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item.field_values_updated", "CatalogItem", id.ToString(), ci.ItemName);

        var result = await BuildDetailQuery().FirstAsync(x => x.Id == id);
        return Ok(ToDetailDto(result));
    }

    // ── Bulk Update ───────────────────────────────────────────────────────────

    [HttpPatch("bulk")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> BulkUpdate([FromBody] BulkUpdateRequest req)
    {
        if (req.ItemIds is null || req.ItemIds.Length == 0)
            return BadRequest(new { message = "ItemIds is required." });

        var items = await _db.CatalogItems
            .Include(ci => ci.ProductTypes)
            .Include(ci => ci.Categories)
            .Where(ci => req.ItemIds.Contains(ci.Id))
            .ToListAsync();

        ICollection<ProductType>? newProductTypes = null;
        if (req.ProductTypeIds is not null)
            newProductTypes = await _db.ProductTypes.Where(pt => req.ProductTypeIds.Contains(pt.Id)).ToListAsync();

        ICollection<ItemCategory>? newCategories = null;
        if (req.CategoryIds is not null)
            newCategories = await _db.ItemCategories.Where(c => req.CategoryIds.Contains(c.Id)).ToListAsync();

        foreach (var ci in items)
        {
            if (req.ProgramId is not null) ci.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;
            if (req.SupplierId is not null) ci.SupplierId = req.SupplierId == 0 ? null : req.SupplierId;
            if (req.VendorId is not null) ci.VendorId = req.VendorId == 0 ? null : req.VendorId;
            if (req.IsActive is not null) ci.IsActive = req.IsActive.Value;
            if (newProductTypes is not null)
            {
                ci.ProductTypes.Clear();
                foreach (var pt in newProductTypes) ci.ProductTypes.Add(pt);
            }
            if (newCategories is not null)
            {
                ci.Categories.Clear();
                foreach (var c in newCategories) ci.Categories.Add(c);
            }
            ci.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { updated = items.Count });
    }

    // ── Import ────────────────────────────────────────────────────────────────

    public record ImportItemSpec(
        string ItemName,
        string? ProgramName,
        string? SupplierName,
        string? VendorName,
        string? VendorItemNumber,
        string? PurchaseUomDescription,
        decimal? PurchaseAmountPerUom,
        string? PurchaseUomName,
        bool? IsActive,
        int? SortOrder,
        IEnumerable<string>? ProductTypeNames,
        IEnumerable<string>? CategoryNames,
        string? CatalogItemTypeName,
        string? CatalogItemSubTypeName);

    public record ImportResultDto(string ItemName, string Action, IEnumerable<string> Warnings);
    public record ImportSummaryDto(IEnumerable<ImportResultDto> Results);

    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Import([FromBody] IEnumerable<ImportItemSpec> specs)
    {
        var allPrograms = await _db.Programs.ToListAsync();
        var allSuppliers = await _db.Suppliers.ToListAsync();
        var allVendors = await _db.Vendors.ToListAsync();
        var allUoms = await _db.UnitsOfMeasure.ToListAsync();
        var allProductTypes = await _db.ProductTypes.ToListAsync();
        var allCategories = await _db.ItemCategories.ToListAsync();
        var allCatalogItemTypes = await _db.CatalogItemTypes.Include(t => t.SubTypes).ToListAsync();

        var results = new List<ImportResultDto>();

        foreach (var spec in specs)
        {
            if (string.IsNullOrWhiteSpace(spec.ItemName)) continue;
            var name = spec.ItemName.Trim();
            var warnings = new List<string>();

            int? programId = ResolveByName(allPrograms, spec.ProgramName, p => p.Name, p => p.Id, warnings, "Program");
            int? supplierId = ResolveByName(allSuppliers, spec.SupplierName, s => s.Name, s => s.Id, warnings, "Supplier");
            int? vendorId = ResolveByName(allVendors, spec.VendorName, v => v.Name, v => v.Id, warnings, "Vendor");
            int? uomId = ResolveByName(allUoms, spec.PurchaseUomName, u => u.Name, u => u.Id, warnings, "PurchaseUom");

            int? catalogItemTypeId = null;
            int? catalogItemSubTypeId = null;
            if (!string.IsNullOrWhiteSpace(spec.CatalogItemTypeName))
            {
                var ciType = allCatalogItemTypes.FirstOrDefault(t => t.Name.Equals(spec.CatalogItemTypeName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (ciType is null) warnings.Add($"CatalogItemType '{spec.CatalogItemTypeName}' not found — skipped.");
                else
                {
                    catalogItemTypeId = ciType.Id;
                    if (!string.IsNullOrWhiteSpace(spec.CatalogItemSubTypeName))
                    {
                        var ciSubType = ciType.SubTypes.FirstOrDefault(s => s.Name.Equals(spec.CatalogItemSubTypeName.Trim(), StringComparison.OrdinalIgnoreCase));
                        if (ciSubType is null) warnings.Add($"CatalogItemSubType '{spec.CatalogItemSubTypeName}' not found under type '{ciType.Name}' — skipped.");
                        else catalogItemSubTypeId = ciSubType.Id;
                    }
                }
            }

            var existing = await _db.CatalogItems
                .Include(ci => ci.ProductTypes)
                .Include(ci => ci.Categories)
                .FirstOrDefaultAsync(ci => ci.ItemName == name && ci.VendorId == vendorId);

            string action;
            if (existing is null)
            {
                var ci = new CatalogItem
                {
                    ItemName = name,
                    ProgramId = programId,
                    SupplierId = supplierId,
                    VendorId = vendorId,
                    VendorItemNumber = spec.VendorItemNumber?.Trim(),
                    PurchaseUomDescription = spec.PurchaseUomDescription?.Trim(),
                    PurchaseAmountPerUom = spec.PurchaseAmountPerUom,
                    PurchaseUomId = uomId,
                    CatalogItemTypeId = catalogItemTypeId,
                    CatalogItemSubTypeId = catalogItemSubTypeId,
                    IsActive = spec.IsActive ?? true,
                    SortOrder = spec.SortOrder ?? 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };

                if (spec.ProductTypeNames is not null)
                {
                    foreach (var ptName in spec.ProductTypeNames)
                    {
                        var pt = allProductTypes.FirstOrDefault(p => p.Name.Equals(ptName, StringComparison.OrdinalIgnoreCase));
                        if (pt is not null) ci.ProductTypes.Add(pt);
                        else warnings.Add($"ProductType '{ptName}' not found.");
                    }
                }

                if (spec.CategoryNames is not null)
                {
                    foreach (var catName in spec.CategoryNames)
                    {
                        var cat = allCategories.FirstOrDefault(c => c.Name.Equals(catName, StringComparison.OrdinalIgnoreCase));
                        if (cat is not null) ci.Categories.Add(cat);
                        else warnings.Add($"Category '{catName}' not found.");
                    }
                }

                _db.CatalogItems.Add(ci);
                action = "created";
            }
            else
            {
                if (programId is not null) existing.ProgramId = programId;
                if (supplierId is not null) existing.SupplierId = supplierId;
                if (spec.VendorItemNumber is not null) existing.VendorItemNumber = spec.VendorItemNumber.Trim();
                if (spec.PurchaseUomDescription is not null) existing.PurchaseUomDescription = spec.PurchaseUomDescription.Trim();
                if (spec.PurchaseAmountPerUom is not null) existing.PurchaseAmountPerUom = spec.PurchaseAmountPerUom;
                if (uomId is not null) existing.PurchaseUomId = uomId;
                if (catalogItemTypeId is not null) existing.CatalogItemTypeId = catalogItemTypeId;
                if (catalogItemSubTypeId is not null) existing.CatalogItemSubTypeId = catalogItemSubTypeId;
                if (spec.IsActive is not null) existing.IsActive = spec.IsActive.Value;
                if (spec.SortOrder is not null) existing.SortOrder = spec.SortOrder.Value;
                existing.UpdatedAt = DateTime.UtcNow;

                if (spec.ProductTypeNames is not null)
                {
                    existing.ProductTypes.Clear();
                    foreach (var ptName in spec.ProductTypeNames)
                    {
                        var pt = allProductTypes.FirstOrDefault(p => p.Name.Equals(ptName, StringComparison.OrdinalIgnoreCase));
                        if (pt is not null) existing.ProductTypes.Add(pt);
                        else warnings.Add($"ProductType '{ptName}' not found.");
                    }
                }

                if (spec.CategoryNames is not null)
                {
                    existing.Categories.Clear();
                    foreach (var catName in spec.CategoryNames)
                    {
                        var cat = allCategories.FirstOrDefault(c => c.Name.Equals(catName, StringComparison.OrdinalIgnoreCase));
                        if (cat is not null) existing.Categories.Add(cat);
                        else warnings.Add($"Category '{catName}' not found.");
                    }
                }

                action = "updated";
            }

            results.Add(new(name, action, warnings));
        }

        await _db.SaveChangesAsync();
        return Ok(new ImportSummaryDto(results));
    }

    private static int? ResolveByName<T>(
        IEnumerable<T> list, string? name,
        Func<T, string> nameSelector, Func<T, int> idSelector,
        List<string> warnings, string entityLabel)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var match = list.FirstOrDefault(x => nameSelector(x).Equals(name.Trim(), StringComparison.OrdinalIgnoreCase));
        if (match is null) warnings.Add($"{entityLabel} '{name}' not found — skipped.");
        return match is null ? null : idSelector(match);
    }

    // ── Export ────────────────────────────────────────────────────────────────

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? search,
        [FromQuery] int? programId,
        [FromQuery] int? categoryId,
        [FromQuery] int? supplierId,
        [FromQuery] int? vendorId,
        [FromQuery] bool? isActive)
    {
        var query = BuildQuery().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(ci => ci.ItemName.Contains(search));
        if (isActive.HasValue)
            query = query.Where(ci => ci.IsActive == isActive.Value);
        if (programId.HasValue)
            query = query.Where(ci => ci.ProgramId == programId.Value);
        if (categoryId.HasValue)
            query = query.Where(ci => ci.Categories.Any(c => c.Id == categoryId.Value));
        if (supplierId.HasValue)
            query = query.Where(ci => ci.SupplierId == supplierId.Value);
        if (vendorId.HasValue)
            query = query.Where(ci => ci.VendorId == vendorId.Value);

        var items = await query.OrderBy(ci => ci.ItemName).ToListAsync();

        // Load active type fields for types present in the result set
        var typeIds = items
            .Where(ci => ci.CatalogItemTypeId.HasValue)
            .Select(ci => ci.CatalogItemTypeId!.Value)
            .Distinct()
            .ToList();

        var allTypeFields = typeIds.Count == 0
            ? []
            : await _db.CatalogItemTypeFields
                .Where(f => typeIds.Contains(f.CatalogItemTypeId) && f.IsActive)
                .OrderBy(f => f.CatalogItemTypeId).ThenBy(f => f.SortOrder).ThenBy(f => f.FieldName)
                .ToListAsync();

        var itemIds = items.Select(ci => ci.Id).ToList();
        var fieldValues = itemIds.Count == 0 || allTypeFields.Count == 0
            ? []
            : await _db.CatalogItemFieldValues
                .Where(v => itemIds.Contains(v.CatalogItemId))
                .ToListAsync();

        // Build a lookup: itemId → (fieldId → value)
        var fvLookup = fieldValues
            .GroupBy(v => v.CatalogItemId)
            .ToDictionary(g => g.Key, g => g.ToDictionary(v => v.CatalogItemTypeFieldId, v => v.Value));

        var staticHeader = "ItemName,ItemType,ItemSubType,Categories,Supplier,Vendor,VendorItemNumber,PurchaseUomDescription,PurchaseAmountPerUom,PurchaseUom,UomType,Program,IsActive,SortOrder,ProductTypes";
        var fieldHeader = allTypeFields.Count == 0
            ? ""
            : "," + string.Join(",", allTypeFields.Select(f => CsvEscape(f.FieldLabel)));

        var sb = new StringBuilder();
        sb.AppendLine(staticHeader + fieldHeader);

        foreach (var ci in items)
        {
            var categoryNames = string.Join("|", ci.Categories.Select(c => c.Name));
            var productTypeNames = string.Join("|", ci.ProductTypes.Select(pt => pt.Name));
            var staticCols = string.Join(",",
                CsvEscape(ci.ItemName),
                CsvEscape(ci.CatalogItemType?.Name),
                CsvEscape(ci.CatalogItemSubType?.Name),
                CsvEscape(categoryNames),
                CsvEscape(ci.Supplier?.Name),
                CsvEscape(ci.Vendor?.Name),
                CsvEscape(ci.VendorItemNumber),
                CsvEscape(ci.PurchaseUomDescription),
                ci.PurchaseAmountPerUom?.ToString() ?? "",
                CsvEscape(ci.PurchaseUom?.Name),
                CsvEscape(ci.PurchaseUom?.UnitCategory),
                CsvEscape(ci.Program?.Name),
                ci.IsActive.ToString(),
                ci.SortOrder.ToString(),
                CsvEscape(productTypeNames));

            if (allTypeFields.Count == 0)
            {
                sb.AppendLine(staticCols);
            }
            else
            {
                fvLookup.TryGetValue(ci.Id, out var itemFvMap);
                var fieldCols = string.Join(",", allTypeFields.Select(f =>
                {
                    // Emit empty cell for fields that don't belong to this item's type
                    if (f.CatalogItemTypeId != ci.CatalogItemTypeId) return "";
                    var val = itemFvMap is not null && itemFvMap.TryGetValue(f.Id, out var v) ? v : null;
                    return CsvEscape(val);
                }));
                sb.AppendLine(staticCols + "," + fieldCols);
            }
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "catalog.csv");
    }

    private static string CsvEscape(string? v)
    {
        if (v is null) return "";
        if (v.Contains(',') || v.Contains('"') || v.Contains('\n'))
            return $"\"{v.Replace("\"", "\"\"")}\"";
        return v;
    }
}
