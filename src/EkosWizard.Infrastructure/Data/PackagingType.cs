namespace ImpWizard.Infrastructure.Data;

public class PackagingType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool HasCount { get; set; }
    public bool HasStyle { get; set; }
    public bool ShowTypeInLabel { get; set; } = true;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<PackagingEntry> Entries { get; set; } = [];
}
