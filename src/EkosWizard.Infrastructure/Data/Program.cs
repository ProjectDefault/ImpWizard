namespace ImpWizard.Infrastructure.Data;

public class Program
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Hex color code for visual distinction (e.g. "#3b82f6").</summary>
    public string? Color { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public ICollection<UserProgramAccess> UserAccess { get; set; } = [];
}
