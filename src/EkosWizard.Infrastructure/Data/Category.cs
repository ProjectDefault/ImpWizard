namespace ImpWizard.Infrastructure.Data;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public int? ProgramId { get; set; }
    public Program? Program { get; set; }

    public ICollection<ReferenceDataSet> DataSets { get; set; } = [];
}
