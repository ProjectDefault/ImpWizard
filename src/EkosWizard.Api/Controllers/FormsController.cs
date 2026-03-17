using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/forms")]
[Authorize(Roles = "Admin")]
public class FormsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ImportTemplateService _importTemplates;
    private readonly IAuditService _audit;

    public FormsController(AppDbContext db, ImportTemplateService importTemplates, IAuditService audit)
    {
        _db = db;
        _importTemplates = importTemplates;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record FormListDto(
        int Id, string Name, string? Description,
        bool IsActive, string Status, int SortOrder, int FieldCount,
        int? ProgramId,
        DateTime CreatedAt, DateTime UpdatedAt);

    public record FormFieldDto(
        int Id, int FormId, string Label, string FieldType,
        bool IsRequired, int SortOrder, bool IsArchived,
        string DataSourceType, int? DataSourceId, string? DataSourceName,
        int? LockedUntilFormId, string? LockedUntilFormName,
        string LockScope, int? MaxLength,
        int? CrossFormPreFillFormId, int? CrossFormPreFillFieldId, string? CrossFormPreFillFieldLabel,
        int? DataSourceFormId, int? DataSourceFieldId, string? DataSourceFormName,
        DateTime CreatedAt, DateTime UpdatedAt);

    public record FormDetailDto(
        int Id, string Name, string? Description,
        bool IsActive, string Status, int SortOrder,
        int? ProgramId,
        DateTime CreatedAt, DateTime UpdatedAt,
        IEnumerable<FormFieldDto> Fields);

    public record CreateFormRequest(string Name, string? Description, int SortOrder = 0, int? ProgramId = null);

    public record UpdateFormRequest(
        string? Name, string? Description,
        bool? IsActive, int? SortOrder, int? ProgramId);

    public record CreateFormFieldRequest(
        string Label, string FieldType,
        bool IsRequired, int SortOrder,
        string DataSourceType, int? DataSourceId,
        int? LockedUntilFormId, string LockScope = "Field",
        int? MaxLength = null);

    public record UpdateFormFieldRequest(
        string? Label, string? FieldType,
        bool? IsRequired, int? SortOrder,
        string? DataSourceType, int? DataSourceId,
        int? LockedUntilFormId, string? LockScope,
        bool? IsArchived, int? MaxLength = null,
        bool ClearMaxLength = false,
        int? CrossFormPreFillFormId = null,
        int? CrossFormPreFillFieldId = null,
        int? DataSourceFormId = null,
        int? DataSourceFieldId = null);

    public record ReorderRequest(int[] FieldIds);

    public record StatusRequest(string Status);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static FormListDto ToListDto(Form f) =>
        new(f.Id, f.Name, f.Description, f.IsActive, f.Status, f.SortOrder,
            f.Fields.Count(ff => !ff.IsArchived), f.ProgramId,
            f.CreatedAt, f.UpdatedAt);

    private static FormFieldDto ToFieldDto(FormField ff) =>
        new(ff.Id, ff.FormId, ff.Label, ff.FieldType,
            ff.IsRequired, ff.SortOrder, ff.IsArchived,
            ff.DataSourceType, ff.DataSourceId,
            GetDataSourceName(ff),
            ff.LockedUntilFormId, ff.LockedUntilForm?.Name,
            ff.LockScope, ff.MaxLength,
            ff.CrossFormPreFillFormId, ff.CrossFormPreFillFieldId, ff.CrossFormPreFillField?.Label,
            ff.DataSourceFormId, ff.DataSourceFieldId, ff.DataSourceForm?.Name,
            ff.CreatedAt, ff.UpdatedAt);

    private static string? GetDataSourceName(FormField ff) => ff.DataSourceType switch
    {
        "ProductType" => "All Product Types",
        "Category" => "All Categories",
        "ProjectSubmission" => ff.DataSourceForm?.Name != null
            ? $"Submissions: {ff.DataSourceForm.Name}"
            : "Project Submissions",
        "UnitOfMeasure" => ff.DataSourceId switch
        {
            1 => "Units of Measure — Volume",
            2 => "Units of Measure — Weight",
            3 => "Units of Measure — Count",
            _ => "All Units of Measure",
        },
        _ => null,
    };

    private FormDetailDto ToDetailDto(Form f) =>
        new(f.Id, f.Name, f.Description, f.IsActive, f.Status, f.SortOrder,
            f.ProgramId, f.CreatedAt, f.UpdatedAt,
            f.Fields.OrderBy(ff => ff.SortOrder).Select(ToFieldDto));

    private IQueryable<Form> FormsWithFields() =>
        _db.Forms
           .Include(f => f.Fields.OrderBy(ff => ff.SortOrder))
               .ThenInclude(ff => ff.LockedUntilForm)
           .Include(f => f.Fields)
               .ThenInclude(ff => ff.CrossFormPreFillField)
           .Include(f => f.Fields)
               .ThenInclude(ff => ff.DataSourceForm);

    // ── Form CRUD ─────────────────────────────────────────────────────────────

    [HttpGet]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetAll()
    {
        IQueryable<Form> query = _db.Forms.Include(f => f.Fields);

        // CIS: restrict to programs they are assigned to (if any restrictions exist)
        if (User.IsInRole("CIS") && !User.IsInRole("Admin"))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var allowedProgramIds = await _db.UserProgramAccess
                .Where(upa => upa.UserId == userId)
                .Select(upa => upa.ProgramId)
                .ToListAsync();

            if (allowedProgramIds.Count > 0)
                query = query.Where(f => f.ProgramId == null || allowedProgramIds.Contains(f.ProgramId!.Value));
        }

        var forms = await query.OrderBy(f => f.SortOrder).ThenBy(f => f.Name).ToListAsync();
        return Ok(forms.Select(ToListDto));
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetById(int id)
    {
        var form = await FormsWithFields()
            .FirstOrDefaultAsync(f => f.Id == id);

        return form is null ? NotFound() : Ok(ToDetailDto(form));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFormRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var form = new Form
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            ProgramId = req.ProgramId,
            IsActive = true,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Forms.Add(form);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "form.created", "Form", form.Id.ToString(), form.Name);
        return CreatedAtAction(nameof(GetById), new { id = form.Id },
            ToDetailDto(form));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateFormRequest req)
    {
        var form = await _db.Forms.FindAsync(id);
        if (form is null) return NotFound();

        if (req.Name is not null) form.Name = req.Name.Trim();
        if (req.Description is not null) form.Description = req.Description.Trim();
        if (req.IsActive is not null) form.IsActive = req.IsActive.Value;
        if (req.SortOrder is not null) form.SortOrder = req.SortOrder.Value;
        if (req.ProgramId is not null) form.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;
        form.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "form.updated", "Form", form.Id.ToString(), form.Name);
        return Ok(await FormsWithFields().FirstOrDefaultAsync(f => f.Id == id)
                  is { } updated ? ToDetailDto(updated) : null);
    }

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusRequest req)
    {
        var form = await FormsWithFields().FirstOrDefaultAsync(f => f.Id == id);
        if (form is null) return NotFound();

        var validTransitions = new Dictionary<string, string[]>
        {
            ["Draft"]    = ["Unlocked"],
            ["Unlocked"] = ["Locked"],
            ["Locked"]   = ["Unlocked"],
        };

        if (!validTransitions.TryGetValue(form.Status, out var allowed) ||
            !allowed.Contains(req.Status))
        {
            return BadRequest(new { message = $"Cannot transition from {form.Status} to {req.Status}." });
        }

        var previousStatus = form.Status;
        form.Status = req.Status;
        form.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Draft → Unlocked: auto-create import template
        if (previousStatus == "Draft" && req.Status == "Unlocked")
        {
            await _importTemplates.CreateFromFormAsync(form);
        }

        // Locked → Unlocked: queue change-detection entry with current field snapshot
        if (previousStatus == "Locked" && req.Status == "Unlocked")
        {
            var snapshot = form.Fields
                .Where(ff => !ff.IsArchived)
                .OrderBy(ff => ff.SortOrder)
                .Select(ff => new
                {
                    id = ff.Id,
                    label = ff.Label,
                    fieldType = ff.FieldType,
                    isRequired = ff.IsRequired,
                    maxLength = ff.MaxLength,
                })
                .ToList();

            _db.FormChangeQueues.Add(new FormChangeQueue
            {
                FormId = id,
                ChangeType = "FormUnlocked",
                FieldSnapshotJson = JsonSerializer.Serialize(new { before = snapshot, after = snapshot }),
                QueuedAt = DateTime.UtcNow,
                IsProcessed = false,
            });
            await _db.SaveChangesAsync();
        }

        return Ok(ToDetailDto(form));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var form = await _db.Forms.FindAsync(id);
        if (form is null) return NotFound();

        var name = form.Name;
        var dependentFields = await _db.FormFields
            .Where(ff => ff.LockedUntilFormId == id)
            .ToListAsync();
        foreach (var ff in dependentFields)
            ff.LockedUntilFormId = null;

        _db.Forms.Remove(form);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "form.deleted", "Form", id.ToString(), name);
        return NoContent();
    }

    [HttpPost("{id:int}/duplicate")]
    public async Task<IActionResult> Duplicate(int id)
    {
        var source = await FormsWithFields().FirstOrDefaultAsync(f => f.Id == id);
        if (source is null) return NotFound();

        var copy = new Form
        {
            Name = source.Name + " (Copy)",
            Description = source.Description,
            IsActive = false,
            Status = "Draft",  // copies always start as Draft
            SortOrder = source.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        foreach (var ff in source.Fields)
        {
            copy.Fields.Add(new FormField
            {
                Label = ff.Label,
                FieldType = ff.FieldType,
                IsRequired = ff.IsRequired,
                SortOrder = ff.SortOrder,
                IsArchived = ff.IsArchived,
                DataSourceType = ff.DataSourceType,
                DataSourceId = ff.DataSourceId,
                LockedUntilFormId = ff.LockedUntilFormId,
                LockScope = ff.LockScope,
                MaxLength = ff.MaxLength,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        _db.Forms.Add(copy);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = copy.Id },
            ToDetailDto(copy));
    }

    // ── Field CRUD ────────────────────────────────────────────────────────────

    [HttpPost("{id:int}/fields")]
    public async Task<IActionResult> AddField(int id, [FromBody] CreateFormFieldRequest req)
    {
        var form = await _db.Forms.FindAsync(id);
        if (form is null) return NotFound();
        if (form.Status == "Locked") return StatusCode(403, new { message = "Form is locked." });

        if (string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { message = "Label is required." });

        var field = new FormField
        {
            FormId = id,
            Label = req.Label.Trim(),
            FieldType = req.FieldType,
            IsRequired = req.IsRequired,
            SortOrder = req.SortOrder,
            DataSourceType = req.DataSourceType,
            DataSourceId = req.DataSourceId,
            LockedUntilFormId = req.LockedUntilFormId,
            LockScope = req.LockScope,
            MaxLength = req.MaxLength,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.FormFields.Add(field);
        await _db.SaveChangesAsync();

        await _db.Entry(field).Reference(ff => ff.LockedUntilForm).LoadAsync();

        if (form.Status == "Unlocked")
            await _importTemplates.SyncFromFormAsync(id);

        return Ok(ToFieldDto(field));
    }

    [HttpPut("{id:int}/fields/{fieldId:int}")]
    public async Task<IActionResult> UpdateField(int id, int fieldId,
        [FromBody] UpdateFormFieldRequest req)
    {
        var form = await _db.Forms.FindAsync(id);
        if (form is null) return NotFound();
        if (form.Status == "Locked") return StatusCode(403, new { message = "Form is locked." });

        var field = await _db.FormFields
            .Include(ff => ff.LockedUntilForm)
            .FirstOrDefaultAsync(ff => ff.Id == fieldId && ff.FormId == id);

        if (field is null) return NotFound();

        if (req.Label is not null) field.Label = req.Label.Trim();
        if (req.FieldType is not null) field.FieldType = req.FieldType;
        if (req.IsRequired is not null) field.IsRequired = req.IsRequired.Value;
        if (req.SortOrder is not null) field.SortOrder = req.SortOrder.Value;
        if (req.DataSourceType is not null) field.DataSourceType = req.DataSourceType;
        if (req.DataSourceId is not null) field.DataSourceId = req.DataSourceId;
        if (req.LockedUntilFormId is not null) field.LockedUntilFormId = req.LockedUntilFormId == 0 ? null : req.LockedUntilFormId;
        if (req.LockScope is not null) field.LockScope = req.LockScope;
        if (req.IsArchived is not null) field.IsArchived = req.IsArchived.Value;
        if (req.ClearMaxLength) field.MaxLength = null;
        else if (req.MaxLength is not null) field.MaxLength = req.MaxLength;
        if (req.CrossFormPreFillFormId is not null) field.CrossFormPreFillFormId = req.CrossFormPreFillFormId == 0 ? null : req.CrossFormPreFillFormId;
        if (req.CrossFormPreFillFieldId is not null) field.CrossFormPreFillFieldId = req.CrossFormPreFillFieldId == 0 ? null : req.CrossFormPreFillFieldId;
        if (req.DataSourceFormId is not null) field.DataSourceFormId = req.DataSourceFormId == 0 ? null : req.DataSourceFormId;
        if (req.DataSourceFieldId is not null) field.DataSourceFieldId = req.DataSourceFieldId == 0 ? null : req.DataSourceFieldId;
        field.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (field.LockedUntilFormId.HasValue)
            await _db.Entry(field).Reference(ff => ff.LockedUntilForm).LoadAsync();
        if (field.CrossFormPreFillFieldId.HasValue)
            await _db.Entry(field).Reference(ff => ff.CrossFormPreFillField).LoadAsync();
        if (field.DataSourceFormId.HasValue)
            await _db.Entry(field).Reference(ff => ff.DataSourceForm).LoadAsync();

        if (form.Status == "Unlocked")
            await _importTemplates.SyncFromFormAsync(id);

        return Ok(ToFieldDto(field));
    }

    [HttpDelete("{id:int}/fields/{fieldId:int}")]
    public async Task<IActionResult> DeleteField(int id, int fieldId)
    {
        var form = await _db.Forms.FindAsync(id);
        if (form is null) return NotFound();
        if (form.Status == "Locked") return StatusCode(403, new { message = "Form is locked." });

        var field = await _db.FormFields
            .FirstOrDefaultAsync(ff => ff.Id == fieldId && ff.FormId == id);

        if (field is null) return NotFound();

        field.IsArchived = true;
        field.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (form.Status == "Unlocked")
            await _importTemplates.SyncFromFormAsync(id);

        return NoContent();
    }

    [HttpPut("{id:int}/fields/reorder")]
    public async Task<IActionResult> ReorderFields(int id, [FromBody] ReorderRequest req)
    {
        var form = await _db.Forms.FindAsync(id);
        if (form is null) return NotFound();
        if (form.Status == "Locked") return StatusCode(403, new { message = "Form is locked." });

        var fields = await _db.FormFields
            .Where(ff => ff.FormId == id && req.FieldIds.Contains(ff.Id))
            .ToListAsync();

        for (int i = 0; i < req.FieldIds.Length; i++)
        {
            var field = fields.FirstOrDefault(ff => ff.Id == req.FieldIds[i]);
            if (field is not null)
            {
                field.SortOrder = i + 1;
                field.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        if (form.Status == "Unlocked")
            await _importTemplates.SyncFromFormAsync(id);

        return NoContent();
    }

    // ── Dependency helpers ────────────────────────────────────────────────────

    [HttpGet("{id:int}/dependencies")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetDependencies(int id)
    {
        var fields = await _db.FormFields
            .Include(ff => ff.LockedUntilForm)
            .Where(ff => ff.FormId == id && !ff.IsArchived && ff.LockedUntilFormId != null)
            .OrderBy(ff => ff.SortOrder)
            .ToListAsync();

        return Ok(fields.Select(ff => new
        {
            fieldId = ff.Id,
            fieldLabel = ff.Label,
            lockedUntilFormId = ff.LockedUntilFormId,
            lockedUntilFormName = ff.LockedUntilForm?.Name,
            lockScope = ff.LockScope,
        }));
    }
}
