namespace ImpWizard.Infrastructure.Data;

public class ProjectFormAssignment
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public int? JourneyItemId { get; set; }
    public JourneyItem? JourneyItem { get; set; }
    public int FormId { get; set; }
    public Form Form { get; set; } = null!;
    public string Status { get; set; } = "NotStarted";
    public string? AssignedToUserId { get; set; }
    public ApplicationUser? AssignedTo { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
