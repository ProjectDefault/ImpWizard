namespace ImpWizard.Infrastructure.Data;

public class ResourceCatalogEntry
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ResourceType { get; set; }
    public string? ResourceUrl { get; set; }
    public string? ResourceLabel { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
