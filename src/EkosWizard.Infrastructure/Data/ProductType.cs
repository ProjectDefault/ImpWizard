namespace ImpWizard.Infrastructure.Data;

public class ProductType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ReferenceDataSet> DataSets { get; set; } = [];
    public ICollection<ReferenceDataItem> Items { get; set; } = [];
    public ICollection<CatalogItem> CatalogItems { get; set; } = [];
}
