namespace ImpWizard.Infrastructure.Data;

public class ImportTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string SourceType { get; set; } = "Form"; // Form|ReferenceData|ProductType|UnitOfMeasure|Category
    public int? FormId { get; set; }
    public Form? Form { get; set; }
    public int? DataSourceId { get; set; }  // used when SourceType != Form
    public string DataBridgeType { get; set; } = "None"; // None|EkosAPI|Webhook|SFTP (future)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public int? ProgramId { get; set; }
    public Program? Program { get; set; }

    public ICollection<ImportTemplateColumn> Columns { get; set; } = [];
}
