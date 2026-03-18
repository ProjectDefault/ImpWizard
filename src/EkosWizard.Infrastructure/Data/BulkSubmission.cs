namespace ImpWizard.Infrastructure.Data;

/// <summary>
/// Staging record for a file upload (CSV/XLSX) submitted in place of manually filling a form.
/// Status: Uploaded → InReview → Finalized
/// </summary>
public class BulkSubmission
{
    public int Id { get; set; }
    public int ProjectFormAssignmentId { get; set; }
    public ProjectFormAssignment ProjectFormAssignment { get; set; } = null!;

    /// <summary>User who uploaded the file (null if uploaded anonymously/system).</summary>
    public string? UploadedByUserId { get; set; }

    public string FileName { get; set; } = string.Empty;

    /// <summary>JSON-serialized string[] of the raw CSV/XLSX column headers.</summary>
    public string OriginalHeadersJson { get; set; } = "[]";

    /// <summary>Uploaded | InReview | Finalized</summary>
    public string Status { get; set; } = "Uploaded";

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<BulkSubmissionRow> Rows { get; set; } = [];
}
