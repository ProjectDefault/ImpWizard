namespace ImpWizard.Infrastructure.Data;

public class Form
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public string Status { get; set; } = "Draft"; // Draft | Unlocked | Locked

    /// <summary>When true, customers can submit a CSV/XLSX file in place of manually filling the form.</summary>
    public bool AllowFileSubmission { get; set; } = false;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Future: FK to Journey when that entity exists
    // public int? JourneyId { get; set; }

    public int? ProgramId { get; set; }
    public Program? Program { get; set; }

    public ICollection<FormField> Fields { get; set; } = [];
}
