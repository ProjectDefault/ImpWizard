namespace ImpWizard.Infrastructure.Data;

/// <summary>
/// Restricts a CIS user to specific programs.
/// If a CIS user has ANY rows here, they can only see journeys and projects
/// belonging to those programs. If no rows exist, they have unrestricted access.
/// </summary>
public class UserProgramAccess
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public int ProgramId { get; set; }
    public Program Program { get; set; } = null!;

    public DateTime GrantedAt { get; set; }
}
