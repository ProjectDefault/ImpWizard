using ImpWizard.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Services;

public class ImportTemplateService
{
    private readonly AppDbContext _db;

    public ImportTemplateService(AppDbContext db) => _db = db;

    // Called when a form transitions from Draft → Unlocked.
    public async Task CreateFromFormAsync(Form form)
    {
        var template = new ImportTemplate
        {
            Name = form.Name,
            SourceType = "Form",
            FormId = form.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        int order = 1;
        foreach (var ff in form.Fields.Where(f => !f.IsArchived).OrderBy(f => f.SortOrder))
        {
            template.Columns.Add(MapFieldToColumn(ff, order++));
        }

        _db.ImportTemplates.Add(template);
        await _db.SaveChangesAsync();
    }

    // Called after any field add/update/delete on an Unlocked form.
    public async Task SyncFromFormAsync(int formId)
    {
        var template = await _db.ImportTemplates
            .Include(t => t.Columns)
            .FirstOrDefaultAsync(t => t.FormId == formId && t.SourceType == "Form");

        if (template is null) return;

        var activeFields = await _db.FormFields
            .Where(ff => ff.FormId == formId && !ff.IsArchived)
            .OrderBy(ff => ff.SortOrder)
            .ToListAsync();

        // Remove columns for archived/removed fields
        var activeFieldIds = activeFields.Select(f => f.Id).ToHashSet();
        var toRemove = template.Columns
            .Where(c => c.FormFieldId.HasValue && !activeFieldIds.Contains(c.FormFieldId.Value))
            .ToList();
        _db.ImportTemplateColumns.RemoveRange(toRemove);

        // Add or update
        int order = 1;
        foreach (var ff in activeFields)
        {
            var existing = template.Columns.FirstOrDefault(c => c.FormFieldId == ff.Id);
            if (existing is null)
            {
                template.Columns.Add(MapFieldToColumn(ff, order));
            }
            else
            {
                existing.Header = ff.Label;
                existing.DataType = ff.FieldType;
                existing.IsRequired = ff.IsRequired;
                existing.MaxLength = ff.MaxLength;
                existing.SortOrder = order;
            }
            order++;
        }

        template.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // Creates a template from a Data Management collection (not linked to a Form).
    public async Task<ImportTemplate> CreateFromDataManagementAsync(
        string sourceType, int? sourceId, string name)
    {
        var template = new ImportTemplate
        {
            Name = name,
            SourceType = sourceType,
            DataSourceId = sourceId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        var columns = sourceType switch
        {
            "ReferenceData" => GetReferenceDataColumns(),
            "ProductType" => GetProductTypeColumns(),
            "UnitOfMeasure" => GetUnitOfMeasureColumns(),
            "Category" => GetCategoryColumns(),
            _ => []
        };

        int order = 1;
        foreach (var col in columns)
        {
            col.SortOrder = order++;
            template.Columns.Add(col);
        }

        _db.ImportTemplates.Add(template);
        await _db.SaveChangesAsync();
        return template;
    }

    private static ImportTemplateColumn MapFieldToColumn(FormField ff, int order) =>
        new()
        {
            Header = ff.Label,
            DataType = ff.FieldType,
            IsRequired = ff.IsRequired,
            SortOrder = order,
            FormFieldId = ff.Id,
            MaxLength = ff.MaxLength,
        };

    private static List<ImportTemplateColumn> GetReferenceDataColumns() =>
    [
        new() { Header = "Name", DataType = "Text", IsRequired = true },
        new() { Header = "Description", DataType = "Textarea" },
        new() { Header = "IsActive", DataType = "Dropdown", AllowedValues = "[\"true\",\"false\"]" },
    ];

    private static List<ImportTemplateColumn> GetProductTypeColumns() =>
    [
        new() { Header = "Name", DataType = "Text", IsRequired = true },
        new() { Header = "Description", DataType = "Textarea" },
    ];

    private static List<ImportTemplateColumn> GetUnitOfMeasureColumns() =>
    [
        new() { Header = "Name", DataType = "Text", IsRequired = true },
        new() { Header = "Abbreviation", DataType = "Text", IsRequired = true },
        new() { Header = "Category", DataType = "Dropdown", AllowedValues = "[\"Volume\",\"Weight\",\"Count\"]", IsRequired = true },
        new() { Header = "System", DataType = "Dropdown", AllowedValues = "[\"Metric\",\"US\",\"Universal\"]", IsRequired = true },
        new() { Header = "ToBaseMultiplier", DataType = "Number" },
        new() { Header = "IsBaseUnit", DataType = "Dropdown", AllowedValues = "[\"true\",\"false\"]" },
    ];

    private static List<ImportTemplateColumn> GetCategoryColumns() =>
    [
        new() { Header = "Name", DataType = "Text", IsRequired = true },
        new() { Header = "Description", DataType = "Textarea" },
    ];
}
