namespace ImpWizard.Infrastructure.Data;

public class UnitOfMeasure
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Abbreviation { get; set; }
    /// <summary>e.g. "Volume", "Weight", "Count"</summary>
    public string UnitCategory { get; set; } = string.Empty;
    /// <summary>e.g. "Metric", "US", "Universal"</summary>
    public string System { get; set; } = string.Empty;
    /// <summary>True if this is the reference unit for its category (ToBaseMultiplier = 1).</summary>
    public bool IsBaseUnit { get; set; }
    /// <summary>How many base units equal 1 of this unit. Base unit itself = 1.</summary>
    public decimal ToBaseMultiplier { get; set; } = 1;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
