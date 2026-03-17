namespace ImpWizard.Infrastructure.Data;

public class MeetingCatalogEntry
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? MeetingType { get; set; }
    public string? Purpose { get; set; }
    public string? Goals { get; set; }
    public int? DefaultDurationMinutes { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
