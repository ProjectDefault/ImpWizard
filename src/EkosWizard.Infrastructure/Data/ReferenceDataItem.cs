namespace ImpWizard.Infrastructure.Data;

public class ReferenceDataItem
{
    public int Id { get; set; }

    public int DataSetId { get; set; }
    public ReferenceDataSet DataSet { get; set; } = null!;

    public string Label { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ProductType> ProductTypes { get; set; } = [];
}
