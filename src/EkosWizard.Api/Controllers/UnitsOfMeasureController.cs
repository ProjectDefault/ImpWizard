using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/units-of-measure")]
[Authorize(Roles = "Admin,CIS")]
public class UnitsOfMeasureController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public UnitsOfMeasureController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record UomDto(
        int Id, string Name, string? Abbreviation,
        string UnitCategory, string System,
        bool IsBaseUnit, decimal ToBaseMultiplier,
        int SortOrder, bool IsActive);

    public record UomConversionDto(
        int ToUnitId, string ToUnitName, string? ToUnitAbbreviation, decimal Factor);

    public record CreateUomRequest(
        string Name, string? Abbreviation,
        string UnitCategory, string System,
        bool IsBaseUnit, decimal ToBaseMultiplier, int SortOrder);

    public record UpdateUomRequest(
        string? Name, string? Abbreviation,
        string? UnitCategory, string? System,
        bool? IsBaseUnit, decimal? ToBaseMultiplier,
        int? SortOrder, bool? IsActive);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static UomDto ToDto(UnitOfMeasure u) =>
        new(u.Id, u.Name, u.Abbreviation, u.UnitCategory, u.System,
            u.IsBaseUnit, u.ToBaseMultiplier, u.SortOrder, u.IsActive);

    private bool IsAdmin() => User.IsInRole("Admin");

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var units = await _db.UnitsOfMeasure
            .OrderBy(u => u.UnitCategory)
            .ThenBy(u => u.SortOrder)
            .ThenBy(u => u.Name)
            .ToListAsync();

        return Ok(units.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var u = await _db.UnitsOfMeasure.FirstOrDefaultAsync(u => u.Id == id);
        return u is null ? NotFound() : Ok(ToDto(u));
    }

    /// <summary>
    /// Returns computed conversions: 1 [this unit] = factor [other unit], for all
    /// active units in the same category. Uses base-unit multiplier math.
    /// </summary>
    [HttpGet("{id:int}/conversions")]
    public async Task<IActionResult> GetConversions(int id)
    {
        var unit = await _db.UnitsOfMeasure.FirstOrDefaultAsync(u => u.Id == id);
        if (unit is null) return NotFound();

        var others = await _db.UnitsOfMeasure
            .Where(u => u.UnitCategory == unit.UnitCategory && u.Id != id && u.IsActive)
            .OrderBy(u => u.SortOrder)
            .ThenBy(u => u.Name)
            .ToListAsync();

        // 1 [unit] = (unit.ToBaseMultiplier / other.ToBaseMultiplier) [other]
        var conversions = others.Select(o => new UomConversionDto(
            o.Id, o.Name, o.Abbreviation,
            unit.ToBaseMultiplier / o.ToBaseMultiplier));

        return Ok(conversions);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUomRequest req)
    {
        if (!IsAdmin()) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (string.IsNullOrWhiteSpace(req.UnitCategory))
            return BadRequest(new { message = "Unit category is required." });
        if (req.ToBaseMultiplier <= 0)
            return BadRequest(new { message = "Conversion factor must be greater than zero." });

        var u = new UnitOfMeasure
        {
            Name = req.Name.Trim(),
            Abbreviation = req.Abbreviation?.Trim(),
            UnitCategory = req.UnitCategory.Trim(),
            System = req.System.Trim(),
            IsBaseUnit = req.IsBaseUnit,
            ToBaseMultiplier = req.IsBaseUnit ? 1 : req.ToBaseMultiplier,
            SortOrder = req.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.UnitsOfMeasure.Add(u);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "unit.created", "UnitOfMeasure", u.Id.ToString(), u.Name);
        return CreatedAtAction(nameof(GetById), new { id = u.Id }, ToDto(u));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUomRequest req)
    {
        if (!IsAdmin()) return Forbid();

        var u = await _db.UnitsOfMeasure.FirstOrDefaultAsync(u => u.Id == id);
        if (u is null) return NotFound();

        if (req.Name is not null) u.Name = req.Name.Trim();
        if (req.Abbreviation is not null) u.Abbreviation = req.Abbreviation.Trim();
        if (req.UnitCategory is not null) u.UnitCategory = req.UnitCategory.Trim();
        if (req.System is not null) u.System = req.System.Trim();
        if (req.IsBaseUnit is not null)
        {
            u.IsBaseUnit = req.IsBaseUnit.Value;
            if (req.IsBaseUnit.Value) u.ToBaseMultiplier = 1;
        }
        if (req.ToBaseMultiplier is not null && !u.IsBaseUnit)
        {
            if (req.ToBaseMultiplier.Value <= 0)
                return BadRequest(new { message = "Conversion factor must be greater than zero." });
            u.ToBaseMultiplier = req.ToBaseMultiplier.Value;
        }
        if (req.SortOrder is not null) u.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) u.IsActive = req.IsActive.Value;
        u.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "unit.updated", "UnitOfMeasure", u.Id.ToString(), u.Name);
        return Ok(ToDto(u));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!IsAdmin()) return Forbid();

        var u = await _db.UnitsOfMeasure.FirstOrDefaultAsync(u => u.Id == id);
        if (u is null) return NotFound();

        var name = u.Name;
        _db.UnitsOfMeasure.Remove(u);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "unit.deleted", "UnitOfMeasure", id.ToString(), name);
        return NoContent();
    }
}
