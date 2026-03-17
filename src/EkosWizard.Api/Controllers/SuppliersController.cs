using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize(Roles = "Admin,CIS")]
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public SuppliersController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record VendorRefDto(int Id, string Name, bool IsActive);
    public record SupplierListDto(int Id, string Name, string? Description, bool IsActive, int VendorCount);
    public record SupplierDetailDto(int Id, string Name, string? Description, bool IsActive, IEnumerable<VendorRefDto> Vendors);
    public record CreateSupplierRequest(string Name, string? Description, bool IsActive = true);
    public record UpdateSupplierRequest(string? Name, string? Description, bool? IsActive);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static SupplierDetailDto ToDetail(Supplier s) => new(
        s.Id, s.Name, s.Description, s.IsActive,
        s.Vendors.OrderBy(v => v.Name).Select(v => new VendorRefDto(v.Id, v.Name, v.IsActive)));

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var suppliers = await _db.Suppliers
            .Include(s => s.Vendors)
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(suppliers.Select(s => new SupplierListDto(s.Id, s.Name, s.Description, s.IsActive, s.Vendors.Count)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _db.Suppliers
            .Include(s => s.Vendors)
            .FirstOrDefaultAsync(s => s.Id == id);

        return s is null ? NotFound() : Ok(ToDetail(s));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSupplierRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var supplier = new Supplier
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            IsActive = req.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "supplier.created", "Supplier", supplier.Id.ToString(), supplier.Name);
        await _db.Entry(supplier).Collection(s => s.Vendors).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, ToDetail(supplier));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSupplierRequest req)
    {
        var supplier = await _db.Suppliers.Include(s => s.Vendors).FirstOrDefaultAsync(s => s.Id == id);
        if (supplier is null) return NotFound();

        if (req.Name is not null) supplier.Name = req.Name.Trim();
        if (req.Description is not null) supplier.Description = req.Description.Trim();
        if (req.IsActive is not null) supplier.IsActive = req.IsActive.Value;
        supplier.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "supplier.updated", "Supplier", supplier.Id.ToString(), supplier.Name);
        return Ok(ToDetail(supplier));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound();

        var name = supplier.Name;
        _db.Suppliers.Remove(supplier);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "supplier.deleted", "Supplier", id.ToString(), name);
        return NoContent();
    }

    // ── Import / Export ───────────────────────────────────────────────────────

    public record ImportSupplierSpec(string Name, string? Description, bool? IsActive);
    public record ImportResultDto(string Name, string Action, string? Warning);
    public record ImportSummaryDto(IEnumerable<ImportResultDto> Results);

    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Import([FromBody] IEnumerable<ImportSupplierSpec> specs)
    {
        var existing = await _db.Suppliers.ToListAsync();
        var results = new List<ImportResultDto>();

        foreach (var spec in specs)
        {
            if (string.IsNullOrWhiteSpace(spec.Name)) continue;
            var name = spec.Name.Trim();
            var match = existing.FirstOrDefault(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

            if (match is null)
            {
                var s = new Supplier
                {
                    Name = name,
                    Description = spec.Description?.Trim(),
                    IsActive = spec.IsActive ?? true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.Suppliers.Add(s);
                results.Add(new(name, "created", null));
            }
            else
            {
                if (spec.Description is not null) match.Description = spec.Description.Trim();
                if (spec.IsActive is not null) match.IsActive = spec.IsActive.Value;
                match.UpdatedAt = DateTime.UtcNow;
                results.Add(new(name, "updated", null));
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new ImportSummaryDto(results));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var suppliers = await _db.Suppliers
            .Include(s => s.Vendors)
            .OrderBy(s => s.Name)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Name,Description,IsActive,VendorCount");
        foreach (var s in suppliers)
        {
            sb.AppendLine($"{CsvEscape(s.Name)},{CsvEscape(s.Description)},{s.IsActive},{s.Vendors.Count}");
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "suppliers.csv");
    }

    private static string CsvEscape(string? v)
    {
        if (v is null) return "";
        if (v.Contains(',') || v.Contains('"') || v.Contains('\n'))
            return $"\"{v.Replace("\"", "\"\"")}\"";
        return v;
    }
}
