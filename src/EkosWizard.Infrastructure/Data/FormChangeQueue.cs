namespace ImpWizard.Infrastructure.Data;

public class FormChangeQueue
{
    public int Id { get; set; }
    public int FormId { get; set; }
    // FieldAdded|FieldRemoved|FieldTypeChanged|RequiredChanged|MaxLengthChanged|FormUnlocked
    public string ChangeType { get; set; } = string.Empty;
    public string? FieldSnapshotJson { get; set; }  // JSON { before: [...], after: [...] }
    public DateTime QueuedAt { get; set; }
    public bool IsProcessed { get; set; }
    public DateTime? ProcessedAt { get; set; }
}
