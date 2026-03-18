namespace ImpWizard.Infrastructure.Data;

/// <summary>
/// The working editor value for one field on one row of a bulk submission.
/// Created when the admin applies a column mapping; updated via inline editing.
/// </summary>
public class BulkSubmissionCell
{
    public int Id { get; set; }
    public int BulkSubmissionRowId { get; set; }
    public BulkSubmissionRow BulkSubmissionRow { get; set; } = null!;

    public int FormFieldId { get; set; }
    public FormField FormField { get; set; } = null!;

    public string Value { get; set; } = string.Empty;
}
