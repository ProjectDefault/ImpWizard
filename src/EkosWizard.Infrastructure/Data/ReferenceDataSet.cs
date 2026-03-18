namespace ImpWizard.Infrastructure.Data;

public class ReferenceDataSet
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>If true, only Admins can add/edit/remove items. CIS users are read-only.</summary>
    public bool IsAdminOnly { get; set; } = false;

    /// <summary>If false, this dataset is hidden from portal dropdowns.</summary>
    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public int? CategoryId { get; set; }
    public Category? Category { get; set; }

    public ICollection<ReferenceDataItem> Items { get; set; } = [];
    public ICollection<ProductType> ProductTypes { get; set; } = [];
    public ICollection<Program> Programs { get; set; } = [];
}
