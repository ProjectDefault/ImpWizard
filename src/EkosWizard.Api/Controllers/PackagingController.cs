using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/packaging")]
[Authorize(Roles = "Admin,CIS")]
public class PackagingController(AppDbContext db, IAuditService audit) : ControllerBase
{
    private readonly AppDbContext _db = db;
    private readonly IAuditService _audit = audit;

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record PackagingTypeDto(int Id, string Name, bool HasCount, bool HasStyle, int SortOrder, bool IsActive);
    public record CreatePackagingTypeRequest(string Name, bool HasCount, bool HasStyle, int SortOrder = 0);
    public record UpdatePackagingTypeRequest(string? Name, bool? HasCount, bool? HasStyle, int? SortOrder, bool? IsActive);

    public record PackagingVolumeDto(int Id, string Name, int SortOrder, bool IsActive);
    public record CreatePackagingVolumeRequest(string Name, int SortOrder = 0);
    public record UpdatePackagingVolumeRequest(string? Name, int? SortOrder, bool? IsActive);

    public record PackagingStyleDto(int Id, string Name, int SortOrder, bool IsActive);
    public record CreatePackagingStyleRequest(string Name, int SortOrder = 0);
    public record UpdatePackagingStyleRequest(string? Name, int? SortOrder, bool? IsActive);

    public record PackagingEntryDto(
        int Id, int PackagingTypeId, string TypeName, bool TypeHasCount, bool TypeHasStyle,
        string? Count, int PackagingVolumeId, string VolumeName,
        int? PackagingStyleId, string? StyleName,
        int SortOrder, bool IsActive, string Label);

    public record CreatePackagingEntryRequest(
        int PackagingTypeId, string? Count,
        int PackagingVolumeId, int? PackagingStyleId,
        int SortOrder = 0);

    public record UpdatePackagingEntryRequest(
        int? PackagingTypeId, string? Count,
        int? PackagingVolumeId, int? PackagingStyleId,
        int? SortOrder, bool? IsActive,
        bool ClearCount = false, bool ClearStyle = false);

    // ── Label helper ──────────────────────────────────────────────────────────

    private static string ComputeLabel(string typeName, string? count, string volumeName, string? styleName)
    {
        var parts = new List<string> { typeName };
        if (count is not null) parts.Add(count);
        parts.Add(volumeName);
        if (styleName is not null) parts.Add(styleName);
        return string.Join(" - ", parts);
    }

    // ── Packaging Types ───────────────────────────────────────────────────────

    [HttpGet("types")]
    public async Task<IActionResult> GetTypes()
    {
        var items = await _db.PackagingTypes
            .OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new PackagingTypeDto(t.Id, t.Name, t.HasCount, t.HasStyle, t.SortOrder, t.IsActive))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("types")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateType([FromBody] CreatePackagingTypeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var item = new PackagingType
        {
            Name = req.Name.Trim(),
            HasCount = req.HasCount,
            HasStyle = req.HasStyle,
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.PackagingTypes.Add(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_type.created", "PackagingType", item.Id.ToString(), item.Name);
        return Ok(new PackagingTypeDto(item.Id, item.Name, item.HasCount, item.HasStyle, item.SortOrder, item.IsActive));
    }

    [HttpPut("types/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateType(int id, [FromBody] UpdatePackagingTypeRequest req)
    {
        var item = await _db.PackagingTypes.FindAsync(id);
        if (item is null) return NotFound();

        if (req.Name is not null) item.Name = req.Name.Trim();
        if (req.HasCount is not null) item.HasCount = req.HasCount.Value;
        if (req.HasStyle is not null) item.HasStyle = req.HasStyle.Value;
        if (req.SortOrder is not null) item.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) item.IsActive = req.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_type.updated", "PackagingType", item.Id.ToString(), item.Name);
        return Ok(new PackagingTypeDto(item.Id, item.Name, item.HasCount, item.HasStyle, item.SortOrder, item.IsActive));
    }

    [HttpDelete("types/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteType(int id)
    {
        var item = await _db.PackagingTypes.FindAsync(id);
        if (item is null) return NotFound();

        var count = await _db.PackagingEntries.CountAsync(e => e.PackagingTypeId == id);
        if (count > 0)
            return BadRequest(new { message = $"Cannot delete: {count} packaging entr{(count == 1 ? "y" : "ies")} use this type." });

        _db.PackagingTypes.Remove(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_type.deleted", "PackagingType", item.Id.ToString(), item.Name);
        return NoContent();
    }

    // ── Packaging Volumes ─────────────────────────────────────────────────────

    [HttpGet("volumes")]
    public async Task<IActionResult> GetVolumes()
    {
        var items = await _db.PackagingVolumes
            .OrderBy(v => v.SortOrder).ThenBy(v => v.Name)
            .Select(v => new PackagingVolumeDto(v.Id, v.Name, v.SortOrder, v.IsActive))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("volumes")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateVolume([FromBody] CreatePackagingVolumeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var item = new PackagingVolume
        {
            Name = req.Name.Trim(),
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.PackagingVolumes.Add(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_volume.created", "PackagingVolume", item.Id.ToString(), item.Name);
        return Ok(new PackagingVolumeDto(item.Id, item.Name, item.SortOrder, item.IsActive));
    }

    [HttpPut("volumes/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateVolume(int id, [FromBody] UpdatePackagingVolumeRequest req)
    {
        var item = await _db.PackagingVolumes.FindAsync(id);
        if (item is null) return NotFound();

        if (req.Name is not null) item.Name = req.Name.Trim();
        if (req.SortOrder is not null) item.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) item.IsActive = req.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_volume.updated", "PackagingVolume", item.Id.ToString(), item.Name);
        return Ok(new PackagingVolumeDto(item.Id, item.Name, item.SortOrder, item.IsActive));
    }

    [HttpDelete("volumes/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteVolume(int id)
    {
        var item = await _db.PackagingVolumes.FindAsync(id);
        if (item is null) return NotFound();

        var count = await _db.PackagingEntries.CountAsync(e => e.PackagingVolumeId == id);
        if (count > 0)
            return BadRequest(new { message = $"Cannot delete: {count} packaging entr{(count == 1 ? "y" : "ies")} use this volume." });

        _db.PackagingVolumes.Remove(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_volume.deleted", "PackagingVolume", item.Id.ToString(), item.Name);
        return NoContent();
    }

    // ── Packaging Styles ──────────────────────────────────────────────────────

    [HttpGet("styles")]
    public async Task<IActionResult> GetStyles()
    {
        var items = await _db.PackagingStyles
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new PackagingStyleDto(s.Id, s.Name, s.SortOrder, s.IsActive))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("styles")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateStyle([FromBody] CreatePackagingStyleRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var item = new PackagingStyle
        {
            Name = req.Name.Trim(),
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.PackagingStyles.Add(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_style.created", "PackagingStyle", item.Id.ToString(), item.Name);
        return Ok(new PackagingStyleDto(item.Id, item.Name, item.SortOrder, item.IsActive));
    }

    [HttpPut("styles/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStyle(int id, [FromBody] UpdatePackagingStyleRequest req)
    {
        var item = await _db.PackagingStyles.FindAsync(id);
        if (item is null) return NotFound();

        if (req.Name is not null) item.Name = req.Name.Trim();
        if (req.SortOrder is not null) item.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) item.IsActive = req.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_style.updated", "PackagingStyle", item.Id.ToString(), item.Name);
        return Ok(new PackagingStyleDto(item.Id, item.Name, item.SortOrder, item.IsActive));
    }

    [HttpDelete("styles/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStyle(int id)
    {
        var item = await _db.PackagingStyles.FindAsync(id);
        if (item is null) return NotFound();

        var count = await _db.PackagingEntries.CountAsync(e => e.PackagingStyleId == id);
        if (count > 0)
            return BadRequest(new { message = $"Cannot delete: {count} packaging entr{(count == 1 ? "y" : "ies")} use this style." });

        _db.PackagingStyles.Remove(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_style.deleted", "PackagingStyle", item.Id.ToString(), item.Name);
        return NoContent();
    }

    // ── Packaging Entries ─────────────────────────────────────────────────────

    [HttpGet("entries")]
    public async Task<IActionResult> GetEntries()
    {
        var entries = await _db.PackagingEntries
            .Include(e => e.Type)
            .Include(e => e.Volume)
            .Include(e => e.Style)
            .OrderBy(e => e.SortOrder)
                .ThenBy(e => e.Type.Name)
                .ThenBy(e => e.Volume.Name)
            .ToListAsync();

        return Ok(entries.Select(e => new PackagingEntryDto(
            e.Id, e.PackagingTypeId, e.Type.Name, e.Type.HasCount, e.Type.HasStyle,
            e.Count, e.PackagingVolumeId, e.Volume.Name,
            e.PackagingStyleId, e.Style?.Name,
            e.SortOrder, e.IsActive,
            ComputeLabel(e.Type.Name, e.Count, e.Volume.Name, e.Style?.Name))));
    }

    [HttpPost("entries")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateEntry([FromBody] CreatePackagingEntryRequest req)
    {
        if (!await _db.PackagingTypes.AnyAsync(t => t.Id == req.PackagingTypeId))
            return BadRequest(new { message = "Invalid packaging type." });
        if (!await _db.PackagingVolumes.AnyAsync(v => v.Id == req.PackagingVolumeId))
            return BadRequest(new { message = "Invalid packaging volume." });
        if (req.PackagingStyleId is not null && !await _db.PackagingStyles.AnyAsync(s => s.Id == req.PackagingStyleId))
            return BadRequest(new { message = "Invalid packaging style." });

        var entry = new PackagingEntry
        {
            PackagingTypeId = req.PackagingTypeId,
            Count = string.IsNullOrWhiteSpace(req.Count) ? null : req.Count.Trim(),
            PackagingVolumeId = req.PackagingVolumeId,
            PackagingStyleId = req.PackagingStyleId,
            SortOrder = req.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.PackagingEntries.Add(entry);
        await _db.SaveChangesAsync();

        await _db.Entry(entry).Reference(e => e.Type).LoadAsync();
        await _db.Entry(entry).Reference(e => e.Volume).LoadAsync();
        if (entry.PackagingStyleId is not null)
            await _db.Entry(entry).Reference(e => e.Style).LoadAsync();

        var label = ComputeLabel(entry.Type.Name, entry.Count, entry.Volume.Name, entry.Style?.Name);
        await _audit.LogAsync(User, "packaging_entry.created", "PackagingEntry", entry.Id.ToString(), label);

        return Ok(new PackagingEntryDto(
            entry.Id, entry.PackagingTypeId, entry.Type.Name, entry.Type.HasCount, entry.Type.HasStyle,
            entry.Count, entry.PackagingVolumeId, entry.Volume.Name,
            entry.PackagingStyleId, entry.Style?.Name,
            entry.SortOrder, entry.IsActive,
            label));
    }

    [HttpPut("entries/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateEntry(int id, [FromBody] UpdatePackagingEntryRequest req)
    {
        var entry = await _db.PackagingEntries
            .Include(e => e.Type)
            .Include(e => e.Volume)
            .Include(e => e.Style)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();

        if (req.PackagingTypeId is not null)
        {
            if (!await _db.PackagingTypes.AnyAsync(t => t.Id == req.PackagingTypeId))
                return BadRequest(new { message = "Invalid packaging type." });
            entry.PackagingTypeId = req.PackagingTypeId.Value;
            await _db.Entry(entry).Reference(e => e.Type).LoadAsync();
        }
        if (req.PackagingVolumeId is not null)
        {
            if (!await _db.PackagingVolumes.AnyAsync(v => v.Id == req.PackagingVolumeId))
                return BadRequest(new { message = "Invalid packaging volume." });
            entry.PackagingVolumeId = req.PackagingVolumeId.Value;
            await _db.Entry(entry).Reference(e => e.Volume).LoadAsync();
        }
        if (req.PackagingStyleId is not null)
        {
            if (!await _db.PackagingStyles.AnyAsync(s => s.Id == req.PackagingStyleId))
                return BadRequest(new { message = "Invalid packaging style." });
            entry.PackagingStyleId = req.PackagingStyleId.Value;
            await _db.Entry(entry).Reference(e => e.Style).LoadAsync();
        }
        if (req.ClearCount) entry.Count = null;
        else if (req.Count is not null) entry.Count = string.IsNullOrWhiteSpace(req.Count) ? null : req.Count.Trim();
        if (req.ClearStyle) { entry.PackagingStyleId = null; entry.Style = null; }
        if (req.SortOrder is not null) entry.SortOrder = req.SortOrder.Value;
        if (req.IsActive is not null) entry.IsActive = req.IsActive.Value;
        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var label = ComputeLabel(entry.Type.Name, entry.Count, entry.Volume.Name, entry.Style?.Name);
        await _audit.LogAsync(User, "packaging_entry.updated", "PackagingEntry", entry.Id.ToString(), label);

        return Ok(new PackagingEntryDto(
            entry.Id, entry.PackagingTypeId, entry.Type.Name, entry.Type.HasCount, entry.Type.HasStyle,
            entry.Count, entry.PackagingVolumeId, entry.Volume.Name,
            entry.PackagingStyleId, entry.Style?.Name,
            entry.SortOrder, entry.IsActive, label));
    }

    [HttpDelete("entries/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteEntry(int id)
    {
        var entry = await _db.PackagingEntries.FindAsync(id);
        if (entry is null) return NotFound();

        _db.PackagingEntries.Remove(entry);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "packaging_entry.deleted", "PackagingEntry", entry.Id.ToString(), $"Entry #{id}");
        return NoContent();
    }

    // ── Import ────────────────────────────────────────────────────────────────

    public record ImportResult(int Created, int Skipped, List<string> Errors);

    /// <summary>
    /// Download a CSV template for bulk import.
    /// </summary>
    [HttpGet("import/template")]
    public IActionResult GetImportTemplate()
    {
        var csv = "Type,Count,Volume,Style\nCase,4x6,16oz,Can\nKeg,,30L,\nSingle,,750ml,Bottle\n";
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "packaging-import-template.csv");
    }

    /// <summary>
    /// Import entries from a CSV file. Columns: Type, Count (optional), Volume, Style (optional).
    /// Types, Volumes, and Styles are created automatically if they don't exist.
    /// Duplicate entries (same type+count+volume+style) are skipped.
    /// </summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ImportEntries(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        List<string> errors = [];
        int created = 0, skipped = 0;

        using var reader = new System.IO.StreamReader(file.OpenReadStream());
        var headerLine = await reader.ReadLineAsync();
        if (headerLine is null)
            return BadRequest(new { message = "File is empty." });

        // Validate header (case-insensitive)
        var headers = headerLine.Split(',').Select(h => h.Trim().ToLowerInvariant()).ToArray();
        int typeIdx = Array.IndexOf(headers, "type");
        int countIdx = Array.IndexOf(headers, "count");
        int volumeIdx = Array.IndexOf(headers, "volume");
        int styleIdx = Array.IndexOf(headers, "style");

        if (typeIdx < 0 || volumeIdx < 0)
            return BadRequest(new { message = "CSV must have at least 'Type' and 'Volume' columns." });

        // Load existing data into memory to minimize round-trips
        var existingTypes = await _db.PackagingTypes.ToListAsync();
        var existingVolumes = await _db.PackagingVolumes.ToListAsync();
        var existingStyles = await _db.PackagingStyles.ToListAsync();
        var existingEntries = await _db.PackagingEntries.ToListAsync();

        int rowNum = 1;
        string? line;
        while ((line = await reader.ReadLineAsync()) is not null)
        {
            rowNum++;
            if (string.IsNullOrWhiteSpace(line)) continue;

            var cols = line.Split(',');
            if (cols.Length <= typeIdx || cols.Length <= volumeIdx)
            {
                errors.Add($"Row {rowNum}: not enough columns.");
                continue;
            }

            var typeName = cols[typeIdx].Trim();
            var volumeName = cols[volumeIdx].Trim();
            var countVal = countIdx >= 0 && countIdx < cols.Length ? cols[countIdx].Trim() : "";
            var styleName = styleIdx >= 0 && styleIdx < cols.Length ? cols[styleIdx].Trim() : "";

            if (string.IsNullOrEmpty(typeName) || string.IsNullOrEmpty(volumeName))
            {
                errors.Add($"Row {rowNum}: Type and Volume are required.");
                continue;
            }

            // Find or create Type
            var type = existingTypes.FirstOrDefault(t => t.Name.Equals(typeName, StringComparison.OrdinalIgnoreCase));
            if (type is null)
            {
                type = new PackagingType
                {
                    Name = typeName,
                    HasCount = !string.IsNullOrEmpty(countVal),
                    HasStyle = !string.IsNullOrEmpty(styleName),
                    SortOrder = existingTypes.Count,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.PackagingTypes.Add(type);
                await _db.SaveChangesAsync();
                existingTypes.Add(type);
            }

            // Find or create Volume
            var volume = existingVolumes.FirstOrDefault(v => v.Name.Equals(volumeName, StringComparison.OrdinalIgnoreCase));
            if (volume is null)
            {
                volume = new PackagingVolume
                {
                    Name = volumeName,
                    SortOrder = existingVolumes.Count,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.PackagingVolumes.Add(volume);
                await _db.SaveChangesAsync();
                existingVolumes.Add(volume);
            }

            // Find or create Style (if provided)
            PackagingStyle? style = null;
            if (!string.IsNullOrEmpty(styleName))
            {
                style = existingStyles.FirstOrDefault(s => s.Name.Equals(styleName, StringComparison.OrdinalIgnoreCase));
                if (style is null)
                {
                    style = new PackagingStyle
                    {
                        Name = styleName,
                        SortOrder = existingStyles.Count,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };
                    _db.PackagingStyles.Add(style);
                    await _db.SaveChangesAsync();
                    existingStyles.Add(style);
                }
            }

            // Check for duplicate entry
            var countNorm = string.IsNullOrEmpty(countVal) ? null : countVal;
            var isDuplicate = existingEntries.Any(e =>
                e.PackagingTypeId == type.Id &&
                e.PackagingVolumeId == volume.Id &&
                (e.PackagingStyleId == style?.Id) &&
                string.Equals(e.Count, countNorm, StringComparison.OrdinalIgnoreCase));

            if (isDuplicate)
            {
                skipped++;
                continue;
            }

            var entry = new PackagingEntry
            {
                PackagingTypeId = type.Id,
                Count = countNorm,
                PackagingVolumeId = volume.Id,
                PackagingStyleId = style?.Id,
                SortOrder = existingEntries.Count,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.PackagingEntries.Add(entry);
            await _db.SaveChangesAsync();
            existingEntries.Add(entry);
            created++;
        }

        await _audit.LogAsync(User, "packaging.imported", "PackagingEntry", null, $"{created} entries imported");
        return Ok(new ImportResult(created, skipped, errors));
    }
}
