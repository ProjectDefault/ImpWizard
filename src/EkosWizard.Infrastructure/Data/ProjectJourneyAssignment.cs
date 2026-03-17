namespace ImpWizard.Infrastructure.Data;

public class ProjectJourneyAssignment
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public int JourneyId { get; set; }
    public Journey Journey { get; set; } = null!;
    public DateTime AssignedAt { get; set; }
    public string? AssignedByUserId { get; set; }
    public ApplicationUser? AssignedBy { get; set; }
    public string? Notes { get; set; }
    public string? SalesforceOpportunityId { get; set; }
    public string? ChurnZeroAccountId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
