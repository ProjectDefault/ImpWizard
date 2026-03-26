using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/catalog-item-types")]
[Authorize(Roles = "Admin,CIS")]
public class CatalogItemTypesController(AppDbContext db, IAuditService audit) : ControllerBase
{
    private readonly AppDbContext _db = db;
    private readonly IAuditService _audit = audit;

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record CatalogItemSubTypeDto(int Id, string Name, string? Description, int SortOrder, bool IsActive, int CatalogItemTypeId);
    public record CatalogItemTypeFieldDto(int Id, string FieldName, string FieldLabel, string FieldType, bool IsRequired, bool IsActive, int SortOrder, int CatalogItemTypeId);
    public record CatalogItemTypeDto(int Id, string Name, string? Description, int SortOrder, bool IsActive, IEnumerable<CatalogItemSubTypeDto> SubTypes, IEnumerable<CatalogItemTypeFieldDto> Fields);

    public record CreateCatalogItemTypeRequest(string Name, string? Description, int SortOrder = 0);
    public record UpdateCatalogItemTypeRequest(string? Name, string? Description, int? SortOrder, bool? IsActive);

    public record CreateCatalogItemSubTypeRequest(string Name, string? Description, int SortOrder = 0);
    public record UpdateCatalogItemSubTypeRequest(string? Name, string? Description, int? SortOrder, bool? IsActive);

    public record CreateCatalogItemTypeFieldRequest(string FieldName, string FieldLabel, string FieldType, bool IsRequired = false, int SortOrder = 0);
    public record UpdateCatalogItemTypeFieldRequest(string? FieldName, string? FieldLabel, string? FieldType, bool? IsRequired, bool? IsActive, int? SortOrder);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CatalogItemTypeDto ToTypeDto(CatalogItemType t) => new(
        t.Id, t.Name, t.Description, t.SortOrder, t.IsActive,
        t.SubTypes.Select(s => new CatalogItemSubTypeDto(s.Id, s.Name, s.Description, s.SortOrder, s.IsActive, s.CatalogItemTypeId)),
        t.Fields.Select(f => new CatalogItemTypeFieldDto(f.Id, f.FieldName, f.FieldLabel, f.FieldType, f.IsRequired, f.IsActive, f.SortOrder, f.CatalogItemTypeId)));

    private static CatalogItemTypeFieldDto ToFieldDto(CatalogItemTypeField f) =>
        new(f.Id, f.FieldName, f.FieldLabel, f.FieldType, f.IsRequired, f.IsActive, f.SortOrder, f.CatalogItemTypeId);

    // ── Types ─────────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetTypes()
    {
        var types = await _db.CatalogItemTypes
            .Include(t => t.SubTypes.OrderBy(s => s.SortOrder).ThenBy(s => s.Name))
            .Include(t => t.Fields.OrderBy(f => f.SortOrder).ThenBy(f => f.FieldName))
            .OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
            .ToListAsync();

        return Ok(types.Select(ToTypeDto));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateType([FromBody] CreateCatalogItemTypeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var item = new CatalogItemType
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.CatalogItemTypes.Add(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type.created", "CatalogItemType", item.Id.ToString(), item.Name);
        return Ok(new CatalogItemTypeDto(item.Id, item.Name, item.Description, item.SortOrder, item.IsActive, [], []));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateType(int id, [FromBody] UpdateCatalogItemTypeRequest req)
    {
        var item = await _db.CatalogItemTypes
            .Include(t => t.SubTypes)
            .Include(t => t.Fields)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (item is null) return NotFound();

        if (req.Name is not null) item.Name = req.Name.Trim();
        if (req.Description is not null) item.Description = req.Description.Trim();
        if (req.SortOrder is not null) item.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) item.IsActive = req.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type.updated", "CatalogItemType", item.Id.ToString(), item.Name);
        return Ok(ToTypeDto(item));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteType(int id)
    {
        var item = await _db.CatalogItemTypes.FindAsync(id);
        if (item is null) return NotFound();

        var itemCount = await _db.CatalogItems.CountAsync(ci => ci.CatalogItemTypeId == id);
        if (itemCount > 0)
            return BadRequest(new { message = $"Cannot delete: {itemCount} catalog item{(itemCount == 1 ? "" : "s")} use this type." });

        var subCount = await _db.CatalogItemSubTypes.CountAsync(s => s.CatalogItemTypeId == id);
        if (subCount > 0)
            return BadRequest(new { message = $"Cannot delete: {subCount} sub-type{(subCount == 1 ? "" : "s")} exist under this type. Delete them first." });

        _db.CatalogItemTypes.Remove(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type.deleted", "CatalogItemType", item.Id.ToString(), item.Name);
        return NoContent();
    }

    // ── SubTypes ──────────────────────────────────────────────────────────────

    [HttpPost("{id}/subtypes")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateSubType(int id, [FromBody] CreateCatalogItemSubTypeRequest req)
    {
        if (!await _db.CatalogItemTypes.AnyAsync(t => t.Id == id))
            return NotFound();

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var item = new CatalogItemSubType
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            CatalogItemTypeId = id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.CatalogItemSubTypes.Add(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_subtype.created", "CatalogItemSubType", item.Id.ToString(), item.Name);
        return Ok(new CatalogItemSubTypeDto(item.Id, item.Name, item.Description, item.SortOrder, item.IsActive, item.CatalogItemTypeId));
    }

    [HttpPut("{id}/subtypes/{subId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSubType(int id, int subId, [FromBody] UpdateCatalogItemSubTypeRequest req)
    {
        var item = await _db.CatalogItemSubTypes.FirstOrDefaultAsync(s => s.Id == subId && s.CatalogItemTypeId == id);
        if (item is null) return NotFound();

        if (req.Name is not null) item.Name = req.Name.Trim();
        if (req.Description is not null) item.Description = req.Description.Trim();
        if (req.SortOrder is not null) item.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) item.IsActive = req.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_subtype.updated", "CatalogItemSubType", item.Id.ToString(), item.Name);
        return Ok(new CatalogItemSubTypeDto(item.Id, item.Name, item.Description, item.SortOrder, item.IsActive, item.CatalogItemTypeId));
    }

    [HttpDelete("{id}/subtypes/{subId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSubType(int id, int subId)
    {
        var item = await _db.CatalogItemSubTypes.FirstOrDefaultAsync(s => s.Id == subId && s.CatalogItemTypeId == id);
        if (item is null) return NotFound();

        var count = await _db.CatalogItems.CountAsync(ci => ci.CatalogItemSubTypeId == subId);
        if (count > 0)
            return BadRequest(new { message = $"Cannot delete: {count} catalog item{(count == 1 ? "" : "s")} use this sub-type." });

        _db.CatalogItemSubTypes.Remove(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_subtype.deleted", "CatalogItemSubType", item.Id.ToString(), item.Name);
        return NoContent();
    }

    // ── Fields ────────────────────────────────────────────────────────────────

    [HttpPost("{id}/fields")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateField(int id, [FromBody] CreateCatalogItemTypeFieldRequest req)
    {
        if (!await _db.CatalogItemTypes.AnyAsync(t => t.Id == id))
            return NotFound();

        if (string.IsNullOrWhiteSpace(req.FieldName))
            return BadRequest(new { message = "FieldName is required." });
        if (string.IsNullOrWhiteSpace(req.FieldLabel))
            return BadRequest(new { message = "FieldLabel is required." });
        if (req.FieldType != "Number" && req.FieldType != "Text")
            return BadRequest(new { message = "FieldType must be 'Number' or 'Text'." });

        var field = new CatalogItemTypeField
        {
            FieldName = req.FieldName.Trim(),
            FieldLabel = req.FieldLabel.Trim(),
            FieldType = req.FieldType,
            IsRequired = req.IsRequired,
            SortOrder = req.SortOrder,
            CatalogItemTypeId = id,
        };
        _db.CatalogItemTypeFields.Add(field);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type_field.created", "CatalogItemTypeField", field.Id.ToString(), field.FieldLabel);
        return Ok(ToFieldDto(field));
    }

    [HttpPut("{id}/fields/{fieldId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateField(int id, int fieldId, [FromBody] UpdateCatalogItemTypeFieldRequest req)
    {
        var field = await _db.CatalogItemTypeFields
            .FirstOrDefaultAsync(f => f.Id == fieldId && f.CatalogItemTypeId == id);
        if (field is null) return NotFound();

        if (req.FieldType is not null && req.FieldType != "Number" && req.FieldType != "Text")
            return BadRequest(new { message = "FieldType must be 'Number' or 'Text'." });

        if (req.FieldName is not null) field.FieldName = req.FieldName.Trim();
        if (req.FieldLabel is not null) field.FieldLabel = req.FieldLabel.Trim();
        if (req.FieldType is not null) field.FieldType = req.FieldType;
        if (req.IsRequired is not null) field.IsRequired = req.IsRequired.Value;
        if (req.IsActive is not null) field.IsActive = req.IsActive.Value;
        if (req.SortOrder is not null) field.SortOrder = req.SortOrder.Value;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type_field.updated", "CatalogItemTypeField", field.Id.ToString(), field.FieldLabel);
        return Ok(ToFieldDto(field));
    }
}
