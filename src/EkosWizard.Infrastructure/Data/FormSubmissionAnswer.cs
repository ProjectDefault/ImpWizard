namespace ImpWizard.Infrastructure.Data;

public class FormSubmissionAnswer
{
    public int Id { get; set; }
    public int FormSubmissionId { get; set; }
    public FormSubmission FormSubmission { get; set; } = null!;
    public int FormFieldId { get; set; }
    public FormField FormField { get; set; } = null!;
    public string Value { get; set; } = string.Empty;
}
