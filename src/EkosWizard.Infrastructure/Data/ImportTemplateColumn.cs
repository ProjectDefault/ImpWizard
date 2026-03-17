namespace ImpWizard.Infrastructure.Data;

public class ImportTemplateColumn
{
    public int Id { get; set; }
    public int ImportTemplateId { get; set; }
    public ImportTemplate ImportTemplate { get; set; } = null!;
    public string Header { get; set; } = string.Empty;
    public string DataType { get; set; } = "Text"; // Text|Number|Date|Dropdown|Checkbox|Textarea
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public int? FormFieldId { get; set; }  // links to originating FormField if SourceType = Form
    public int? MaxLength { get; set; }
    public string? AllowedValues { get; set; }  // JSON array of strings for Dropdown validation
}
