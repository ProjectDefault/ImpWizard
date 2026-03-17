namespace ImpWizard.Infrastructure.Data;

public class ProjectUserAccess
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public string Role { get; set; } = string.Empty; // "SuperCustomer" | "Customer"
    public DateTime GrantedAt { get; set; }
    public string? GrantedByUserId { get; set; }
    public ApplicationUser? GrantedBy { get; set; }
}
