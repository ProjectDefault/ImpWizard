namespace ImpWizard.Infrastructure.Data;

public class ProjectResource
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public int? JourneyItemId { get; set; }
    public JourneyItem? JourneyItem { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ResourceType { get; set; }
    public string ResourceUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? GoogleDriveFileId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
