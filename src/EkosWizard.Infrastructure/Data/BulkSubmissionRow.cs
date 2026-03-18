namespace ImpWizard.Infrastructure.Data;

/// <summary>
/// One row from the uploaded CSV/XLSX file.
/// Status: Pending | Approved | Rejected | Deleted
/// </summary>
public class BulkSubmissionRow
{
    public int Id { get; set; }
    public int BulkSubmissionId { get; set; }
    public BulkSubmission BulkSubmission { get; set; } = null!;

    /// <summary>0-based row index from the original file (for display ordering).</summary>
    public int RowIndex { get; set; }

    /// <summary>JSON-serialized Dictionary&lt;string, string&gt; of raw header → raw cell value.</summary>
    public string RawDataJson { get; set; } = "{}";

    /// <summary>Pending | Approved | Rejected | Deleted</summary>
    public string Status { get; set; } = "Pending";

    public string? RejectionReason { get; set; }

    /// <summary>Set on finalize — the FormSubmission created for this approved row.</summary>
    public int? ResultFormSubmissionId { get; set; }
    public FormSubmission? ResultFormSubmission { get; set; }

    public List<BulkSubmissionCell> Cells { get; set; } = [];
}
