namespace ImpWizard.Infrastructure.Data;

public class FormSubmission
{
    public int Id { get; set; }
    public int ProjectFormAssignmentId { get; set; }
    public ProjectFormAssignment ProjectFormAssignment { get; set; } = null!;
    public string? SubmittedByUserId { get; set; }
    public ApplicationUser? SubmittedBy { get; set; }
    public string Status { get; set; } = "Draft"; // Draft | Submitted
    public DateTime? SubmittedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<FormSubmissionAnswer> Answers { get; set; } = [];
}
