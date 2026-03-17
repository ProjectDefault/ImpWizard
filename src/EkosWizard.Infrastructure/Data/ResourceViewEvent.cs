namespace ImpWizard.Infrastructure.Data;

public class ResourceViewEvent
{
    public long Id { get; set; }
    public int ResourceId { get; set; }
    public ProjectResource Resource { get; set; } = null!;
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public DateTime ViewedAt { get; set; }
}
