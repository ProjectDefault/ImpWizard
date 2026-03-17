using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/catalog-item-types")]
[Authorize(Roles = "Admin,CIS")]
public class CatalogItemTypesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public CatalogItemTypesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record SubTypeDto(int Id, string Name, string? Description, int SortOrder, bool IsActive);
    public record TypeFieldDto(int Id, string FieldName, string FieldLabel, string FieldType, bool IsRequired, int SortOrder);
    public record CatalogItemTypeListDto(int Id, string Name, string? Description, int SortOrder, bool IsActive, int SubTypeCount, int FieldCount);
    public record CatalogItemTypeDetailDto(int Id, string Name, string? Description, int SortOrder, bool IsActive, IEnumerable<SubTypeDto> SubTypes, IEnumerable<TypeFieldDto> Fields);

    public record CreateTypeRequest(string Name, string? Description, int SortOrder = 0, bool IsActive = true);
    public record UpdateTypeRequest(string? Name, string? Description, int? SortOrder, bool? IsActive);
    public record CreateSubTypeRequest(string Name, string? Description, int SortOrder = 0, bool IsActive = true);
    public record UpdateSubTypeRequest(string? Name, string? Description, int? SortOrder, bool? IsActive);
    public record CreateTypeFieldRequest(string FieldName, string FieldLabel, string FieldType, bool IsRequired = false, int SortOrder = 0);
    public record UpdateTypeFieldRequest(string? FieldName, string? FieldLabel, string? FieldType, bool? IsRequired, int? SortOrder);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CatalogItemTypeDetailDto ToDetail(CatalogItemType t) => new(
        t.Id, t.Name, t.Description, t.SortOrder, t.IsActive,
        t.SubTypes.OrderBy(s => s.SortOrder).ThenBy(s => s.Name).Select(s => new SubTypeDto(s.Id, s.Name, s.Description, s.SortOrder, s.IsActive)),
        t.Fields.OrderBy(f => f.SortOrder).ThenBy(f => f.FieldLabel).Select(f => new TypeFieldDto(f.Id, f.FieldName, f.FieldLabel, f.FieldType, f.IsRequired, f.SortOrder)));

    // ── Types CRUD ────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var types = await _db.CatalogItemTypes
            .Include(t => t.SubTypes)
            .Include(t => t.Fields)
            .OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
            .ToListAsync();

        return Ok(types.Select(t => new CatalogItemTypeListDto(t.Id, t.Name, t.Description, t.SortOrder, t.IsActive, t.SubTypes.Count, t.Fields.Count)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await _db.CatalogItemTypes
            .Include(t => t.SubTypes)
            .Include(t => t.Fields)
            .FirstOrDefaultAsync(t => t.Id == id);

        return t is null ? NotFound() : Ok(ToDetail(t));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateTypeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var t = new CatalogItemType
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            IsActive = req.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.CatalogItemTypes.Add(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type.created", "CatalogItemType", t.Id.ToString(), t.Name);
        return CreatedAtAction(nameof(GetById), new { id = t.Id }, ToDetail(t));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTypeRequest req)
    {
        var t = await _db.CatalogItemTypes.Include(t => t.SubTypes).Include(t => t.Fields).FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();

        if (req.Name is not null) t.Name = req.Name.Trim();
        if (req.Description is not null) t.Description = req.Description.Trim();
        if (req.SortOrder is not null) t.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) t.IsActive = req.IsActive.Value;
        t.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type.updated", "CatalogItemType", t.Id.ToString(), t.Name);
        return Ok(ToDetail(t));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var t = await _db.CatalogItemTypes.FindAsync(id);
        if (t is null) return NotFound();

        var name = t.Name;

        // ClientSetNull: manually clear FKs on CatalogItems before EF deletes the type
        // (cascading SubType → CatalogItemSubTypeId must also be cleared first)
        var subTypeIds = await _db.CatalogItemSubTypes
            .Where(s => s.CatalogItemTypeId == id)
            .Select(s => s.Id)
            .ToListAsync();

        await _db.CatalogItems
            .Where(ci => ci.CatalogItemTypeId == id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(ci => ci.CatalogItemTypeId, (int?)null)
                .SetProperty(ci => ci.CatalogItemSubTypeId, (int?)null));

        if (subTypeIds.Count > 0)
            await _db.CatalogItems
                .Where(ci => subTypeIds.Contains(ci.CatalogItemSubTypeId!.Value))
                .ExecuteUpdateAsync(s => s.SetProperty(ci => ci.CatalogItemSubTypeId, (int?)null));

        _db.CatalogItemTypes.Remove(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "catalog_item_type.deleted", "CatalogItemType", id.ToString(), name);
        return NoContent();
    }

    // ── SubTypes ──────────────────────────────────────────────────────────────

    [HttpPost("{id:int}/subtypes")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddSubType(int id, [FromBody] CreateSubTypeRequest req)
    {
        if (!await _db.CatalogItemTypes.AnyAsync(t => t.Id == id)) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { message = "Name is required." });

        var sub = new CatalogItemSubType
        {
            CatalogItemTypeId = id,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            IsActive = req.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.CatalogItemSubTypes.Add(sub);
        await _db.SaveChangesAsync();

        var t = await _db.CatalogItemTypes.Include(t => t.SubTypes).Include(t => t.Fields).FirstAsync(t => t.Id == id);
        return Ok(ToDetail(t));
    }

    [HttpPut("{id:int}/subtypes/{subId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSubType(int id, int subId, [FromBody] UpdateSubTypeRequest req)
    {
        var sub = await _db.CatalogItemSubTypes.FirstOrDefaultAsync(s => s.Id == subId && s.CatalogItemTypeId == id);
        if (sub is null) return NotFound();

        if (req.Name is not null) sub.Name = req.Name.Trim();
        if (req.Description is not null) sub.Description = req.Description.Trim();
        if (req.SortOrder is not null) sub.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) sub.IsActive = req.IsActive.Value;
        sub.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var t = await _db.CatalogItemTypes.Include(t => t.SubTypes).Include(t => t.Fields).FirstAsync(t => t.Id == id);
        return Ok(ToDetail(t));
    }

    [HttpDelete("{id:int}/subtypes/{subId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSubType(int id, int subId)
    {
        var sub = await _db.CatalogItemSubTypes.FirstOrDefaultAsync(s => s.Id == subId && s.CatalogItemTypeId == id);
        if (sub is null) return NotFound();

        // ClientSetNull: manually clear CatalogItemSubTypeId before EF removes the subtype
        await _db.CatalogItems
            .Where(ci => ci.CatalogItemSubTypeId == subId)
            .ExecuteUpdateAsync(s => s.SetProperty(ci => ci.CatalogItemSubTypeId, (int?)null));

        _db.CatalogItemSubTypes.Remove(sub);
        await _db.SaveChangesAsync();

        var t = await _db.CatalogItemTypes.Include(t => t.SubTypes).Include(t => t.Fields).FirstAsync(t => t.Id == id);
        return Ok(ToDetail(t));
    }

    // ── Custom Fields ─────────────────────────────────────────────────────────

    [HttpPost("{id:int}/fields")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddField(int id, [FromBody] CreateTypeFieldRequest req)
    {
        if (!await _db.CatalogItemTypes.AnyAsync(t => t.Id == id)) return NotFound();
        if (string.IsNullOrWhiteSpace(req.FieldName)) return BadRequest(new { message = "FieldName is required." });
        if (string.IsNullOrWhiteSpace(req.FieldLabel)) return BadRequest(new { message = "FieldLabel is required." });

        var validTypes = new[] { "Text", "Number", "Boolean" };
        if (!validTypes.Contains(req.FieldType)) return BadRequest(new { message = "FieldType must be Text, Number, or Boolean." });

        var field = new CatalogItemTypeField
        {
            CatalogItemTypeId = id,
            FieldName = req.FieldName.Trim(),
            FieldLabel = req.FieldLabel.Trim(),
            FieldType = req.FieldType,
            IsRequired = req.IsRequired,
            SortOrder = req.SortOrder,
        };
        _db.CatalogItemTypeFields.Add(field);
        await _db.SaveChangesAsync();

        var t = await _db.CatalogItemTypes.Include(t => t.SubTypes).Include(t => t.Fields).FirstAsync(t => t.Id == id);
        return Ok(ToDetail(t));
    }

    [HttpPut("{id:int}/fields/{fieldId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateField(int id, int fieldId, [FromBody] UpdateTypeFieldRequest req)
    {
        var field = await _db.CatalogItemTypeFields.FirstOrDefaultAsync(f => f.Id == fieldId && f.CatalogItemTypeId == id);
        if (field is null) return NotFound();

        if (req.FieldName is not null) field.FieldName = req.FieldName.Trim();
        if (req.FieldLabel is not null) field.FieldLabel = req.FieldLabel.Trim();
        if (req.FieldType is not null)
        {
            var validTypes = new[] { "Text", "Number", "Boolean" };
            if (!validTypes.Contains(req.FieldType)) return BadRequest(new { message = "FieldType must be Text, Number, or Boolean." });
            field.FieldType = req.FieldType;
        }
        if (req.IsRequired is not null) field.IsRequired = req.IsRequired.Value;
        if (req.SortOrder is not null) field.SortOrder = req.SortOrder.Value;

        await _db.SaveChangesAsync();

        var t = await _db.CatalogItemTypes.Include(t => t.SubTypes).Include(t => t.Fields).FirstAsync(t => t.Id == id);
        return Ok(ToDetail(t));
    }

    [HttpDelete("{id:int}/fields/{fieldId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteField(int id, int fieldId)
    {
        var field = await _db.CatalogItemTypeFields.FirstOrDefaultAsync(f => f.Id == fieldId && f.CatalogItemTypeId == id);
        if (field is null) return NotFound();
        _db.CatalogItemTypeFields.Remove(field);
        await _db.SaveChangesAsync();

        var t = await _db.CatalogItemTypes.Include(t => t.SubTypes).Include(t => t.Fields).FirstAsync(t => t.Id == id);
        return Ok(ToDetail(t));
    }
}
