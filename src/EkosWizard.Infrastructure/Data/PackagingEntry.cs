namespace ImpWizard.Infrastructure.Data;

public class PackagingEntry
{
    public int Id { get; set; }
    public int PackagingTypeId { get; set; }
    public string? Count { get; set; }
    public int PackagingVolumeId { get; set; }
    public int? PackagingStyleId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public PackagingType Type { get; set; } = null!;
    public PackagingVolume Volume { get; set; } = null!;
    public PackagingStyle? Style { get; set; }
}
