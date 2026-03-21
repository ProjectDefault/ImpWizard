using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/import-templates")]
[Authorize(Roles = "Admin,CIS")]
public class ImportTemplatesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ImportTemplateService _templateService;
    private readonly ExportService _exportService;
    private readonly IAuditService _audit;

    public ImportTemplatesController(
        AppDbContext db,
        ImportTemplateService templateService,
        ExportService exportService,
        IAuditService audit)
    {
        _db = db;
        _templateService = templateService;
        _exportService = exportService;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ImportTemplateListDto(
        int Id, string Name, string? Description,
        string SourceType, int? FormId, string? FormName,
        string DataBridgeType, bool IsActive, int ColumnCount,
        int? ProgramId,
        DateTime CreatedAt, DateTime UpdatedAt);

    public record ImportTemplateColumnDto(
        int Id, string Header, string DataType, bool IsRequired,
        int SortOrder, int? FormFieldId, int? MaxLength, string? AllowedValues);

    public record ImportTemplateDetailDto(
        int Id, string Name, string? Description,
        string SourceType, int? FormId, string? FormName,
        string DataBridgeType, bool IsActive,
        int? ProgramId,
        DateTime CreatedAt, DateTime UpdatedAt,
        IEnumerable<ImportTemplateColumnDto> Columns);

    public record CreateTemplateRequest(string Name, string? Description, int? ProgramId = null);
    public record UpdateTemplateRequest(string? Name, string? Description, bool? IsActive, int? ProgramId = null);
    public record DataManagementTemplateRequest(string SourceType, int? SourceId, string Name);

    // ── List & Detail ─────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var templates = await _db.ImportTemplates
            .Include(t => t.Columns)
            .Include(t => t.Form)
            .OrderByDescending(t => t.UpdatedAt)
            .ToListAsync();

        return Ok(templates.Select(t => new ImportTemplateListDto(
            t.Id, t.Name, t.Description,
            t.SourceType, t.FormId, t.Form?.Name,
            t.DataBridgeType, t.IsActive, t.Columns.Count,
            t.ProgramId, t.CreatedAt, t.UpdatedAt)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await _db.ImportTemplates
            .Include(t => t.Columns.OrderBy(c => c.SortOrder))
            .Include(t => t.Form)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t is null) return NotFound();

        return Ok(new ImportTemplateDetailDto(
            t.Id, t.Name, t.Description,
            t.SourceType, t.FormId, t.Form?.Name,
            t.DataBridgeType, t.IsActive, t.ProgramId,
            t.CreatedAt, t.UpdatedAt,
            t.Columns.Select(c => new ImportTemplateColumnDto(
                c.Id, c.Header, c.DataType, c.IsRequired,
                c.SortOrder, c.FormFieldId, c.MaxLength, c.AllowedValues))));
    }

    // ── Create / Update / Delete ───────────────────────────────────────────────

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateTemplateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var template = new ImportTemplate
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SourceType = "Manual",
            ProgramId = req.ProgramId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ImportTemplates.Add(template);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "import_template.created", "ImportTemplate", template.Id.ToString(), template.Name);
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, template.Id);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTemplateRequest req)
    {
        var t = await _db.ImportTemplates.FindAsync(id);
        if (t is null) return NotFound();

        if (req.Name is not null) t.Name = req.Name.Trim();
        if (req.Description is not null) t.Description = req.Description.Trim();
        if (req.IsActive is not null) t.IsActive = req.IsActive.Value;
        if (req.ProgramId is not null) t.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;
        t.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "import_template.updated", "ImportTemplate", t.Id.ToString(), t.Name);
        return Ok();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var t = await _db.ImportTemplates.FindAsync(id);
        if (t is null) return NotFound();

        var name = t.Name;
        _db.ImportTemplates.Remove(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "import_template.deleted", "ImportTemplate", id.ToString(), name);
        return NoContent();
    }

    // ── Generate from Data Management ─────────────────────────────────────────

    [HttpPost("from-data-management")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateFromDataManagement(
        [FromBody] DataManagementTemplateRequest req)
    {
        var validTypes = new[] { "ReferenceData", "ProductType", "UnitOfMeasure", "Category", "ProductList" };
        if (!validTypes.Contains(req.SourceType))
            return BadRequest(new { message = "Invalid SourceType." });

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var template = await _templateService.CreateFromDataManagementAsync(
            req.SourceType, req.SourceId, req.Name.Trim());

        return CreatedAtAction(nameof(GetById), new { id = template.Id }, template.Id);
    }

    // ── Export ────────────────────────────────────────────────────────────────

    [HttpGet("{id:int}/export")]
    public async Task<IActionResult> Export(int id, [FromQuery] string format = "xlsx",
        [FromQuery] string? sheetName = null, [FromQuery] int? projectId = null)
    {
        var t = await _db.ImportTemplates
            .Include(t => t.Columns.OrderBy(c => c.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t is null) return NotFound();

        // ProductList templates export pre-populated rows from the project's product list
        if (t.SourceType == "ProductList")
        {
            if (projectId is null)
                return BadRequest(new { message = "projectId is required when exporting a ProductList template." });

            var productList = await _db.ProducerProductLists
                .Include(pl => pl.Products)
                .FirstOrDefaultAsync(pl => pl.ProjectId == projectId.Value);

            var products = productList?.Products ?? [];

            if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
            {
                var csv = _exportService.ExportProductListToCsv(t, products);
                return File(csv, "text/csv", $"{t.Name}.csv");
            }
            else
            {
                var xlsx = _exportService.ExportProductListToXlsx(t, products, sheetName ?? t.Name);
                return File(xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"{t.Name}.xlsx");
            }
        }

        if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
        {
            var csv = _exportService.ExportToCsv(t);
            return File(csv, "text/csv", $"{t.Name}.csv");
        }
        else
        {
            var xlsx = _exportService.ExportToXlsx(t, sheetName ?? t.Name);
            return File(xlsx,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"{t.Name}.xlsx");
        }
    }
}

// ── Form Change Impact Review ──────────────────────────────────────────────────

[ApiController]
[Route("api/form-change-impacts")]
[Authorize(Roles = "Admin,CIS")]
public class FormChangeImpactsController : ControllerBase
{
    private readonly AppDbContext _db;

    public FormChangeImpactsController(AppDbContext db) => _db = db;

    public record ImpactDto(
        int Id, int FormChangeQueueId, int FormId, string ChangeType,
        int ProjectId, string ProjectName, string? ValidationIssuesJson,
        bool IsReviewed, DateTime? ReviewedAt, DateTime QueuedAt);

    [HttpGet]
    public async Task<IActionResult> GetPending()
    {
        var impacts = await _db.FormProjectImpacts
            .Include(i => i.ChangeQueue)
            .Include(i => i.Project)
            .Where(i => !i.IsReviewed)
            .OrderBy(i => i.ChangeQueue.QueuedAt)
            .ToListAsync();

        return Ok(impacts.Select(i => new ImpactDto(
            i.Id, i.FormChangeQueueId, i.ChangeQueue.FormId, i.ChangeQueue.ChangeType,
            i.ProjectId, i.Project.CustomerName, i.ValidationIssuesJson,
            i.IsReviewed, i.ReviewedAt, i.ChangeQueue.QueuedAt)));
    }

    [HttpPut("{id:int}/review")]
    public async Task<IActionResult> MarkReviewed(int id)
    {
        var impact = await _db.FormProjectImpacts.FindAsync(id);
        if (impact is null) return NotFound();

        impact.IsReviewed = true;
        impact.ReviewedAt = DateTime.UtcNow;
        impact.ReviewedByUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        await _db.SaveChangesAsync();
        return Ok();
    }
}
