using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/vendors")]
[Authorize(Roles = "Admin,CIS")]
public class VendorsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public VendorsController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record SupplierRefDto(int Id, string Name);
    public record VendorListDto(int Id, string Name, string? Description, bool IsActive, SupplierRefDto? Supplier);
    public record VendorDetailDto(int Id, string Name, string? Description, bool IsActive, SupplierRefDto? Supplier);
    public record CreateVendorRequest(string Name, string? Description, int? SupplierId, bool IsActive = true);
    public record UpdateVendorRequest(string? Name, string? Description, int? SupplierId, bool? IsActive);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static SupplierRefDto? ToSupplierRef(Supplier? s) => s is null ? null : new(s.Id, s.Name);

    private static VendorDetailDto ToDetail(Vendor v) => new(v.Id, v.Name, v.Description, v.IsActive, ToSupplierRef(v.Supplier));

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var vendors = await _db.Vendors
            .Include(v => v.Supplier)
            .OrderBy(v => v.Name)
            .ToListAsync();

        return Ok(vendors.Select(v => new VendorListDto(v.Id, v.Name, v.Description, v.IsActive, ToSupplierRef(v.Supplier))));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var v = await _db.Vendors.Include(v => v.Supplier).FirstOrDefaultAsync(v => v.Id == id);
        return v is null ? NotFound() : Ok(ToDetail(v));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateVendorRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var vendor = new Vendor
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SupplierId = req.SupplierId == 0 ? null : req.SupplierId,
            IsActive = req.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "vendor.created", "Vendor", vendor.Id.ToString(), vendor.Name);
        await _db.Entry(vendor).Reference(v => v.Supplier).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = vendor.Id }, ToDetail(vendor));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateVendorRequest req)
    {
        var vendor = await _db.Vendors.Include(v => v.Supplier).FirstOrDefaultAsync(v => v.Id == id);
        if (vendor is null) return NotFound();

        if (req.Name is not null) vendor.Name = req.Name.Trim();
        if (req.Description is not null) vendor.Description = req.Description.Trim();
        if (req.SupplierId is not null) vendor.SupplierId = req.SupplierId == 0 ? null : req.SupplierId;
        if (req.IsActive is not null) vendor.IsActive = req.IsActive.Value;
        vendor.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "vendor.updated", "Vendor", vendor.Id.ToString(), vendor.Name);
        if (vendor.SupplierId is not null && vendor.Supplier?.Id != vendor.SupplierId)
            await _db.Entry(vendor).Reference(v => v.Supplier).LoadAsync();
        return Ok(ToDetail(vendor));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var vendor = await _db.Vendors.FindAsync(id);
        if (vendor is null) return NotFound();

        var name = vendor.Name;
        _db.Vendors.Remove(vendor);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "vendor.deleted", "Vendor", id.ToString(), name);
        return NoContent();
    }

    // ── Import / Export ───────────────────────────────────────────────────────

    public record ImportVendorSpec(string Name, string? Description, string? SupplierName, bool? IsActive);
    public record ImportResultDto(string Name, string Action, string? Warning);
    public record ImportSummaryDto(IEnumerable<ImportResultDto> Results);

    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Import([FromBody] IEnumerable<ImportVendorSpec> specs)
    {
        var existingVendors = await _db.Vendors.Include(v => v.Supplier).ToListAsync();
        var allSuppliers = await _db.Suppliers.ToListAsync();
        var results = new List<ImportResultDto>();

        foreach (var spec in specs)
        {
            if (string.IsNullOrWhiteSpace(spec.Name)) continue;
            var name = spec.Name.Trim();

            // Resolve supplier by name
            int? supplierId = null;
            string? warning = null;
            if (!string.IsNullOrWhiteSpace(spec.SupplierName))
            {
                var sup = allSuppliers.FirstOrDefault(s => s.Name.Equals(spec.SupplierName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (sup is not null) supplierId = sup.Id;
                else warning = $"Supplier '{spec.SupplierName}' not found — skipped assignment.";
            }

            var match = existingVendors.FirstOrDefault(v => v.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (match is null)
            {
                var v = new Vendor
                {
                    Name = name,
                    Description = spec.Description?.Trim(),
                    SupplierId = supplierId,
                    IsActive = spec.IsActive ?? true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.Vendors.Add(v);
                results.Add(new(name, "created", warning));
            }
            else
            {
                if (spec.Description is not null) match.Description = spec.Description.Trim();
                if (supplierId is not null) match.SupplierId = supplierId;
                if (spec.IsActive is not null) match.IsActive = spec.IsActive.Value;
                match.UpdatedAt = DateTime.UtcNow;
                results.Add(new(name, "updated", warning));
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new ImportSummaryDto(results));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var vendors = await _db.Vendors
            .Include(v => v.Supplier)
            .OrderBy(v => v.Name)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Name,Description,SupplierName,IsActive");
        foreach (var v in vendors)
        {
            sb.AppendLine($"{CsvEscape(v.Name)},{CsvEscape(v.Description)},{CsvEscape(v.Supplier?.Name)},{v.IsActive}");
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "vendors.csv");
    }

    private static string CsvEscape(string? v)
    {
        if (v is null) return "";
        if (v.Contains(',') || v.Contains('"') || v.Contains('\n'))
            return $"\"{v.Replace("\"", "\"\"")}\"";
        return v;
    }
}
