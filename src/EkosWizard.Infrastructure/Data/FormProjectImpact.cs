namespace ImpWizard.Infrastructure.Data;

public class FormProjectImpact
{
    public int Id { get; set; }
    public int FormChangeQueueId { get; set; }
    public FormChangeQueue ChangeQueue { get; set; } = null!;
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public string? ValidationIssuesJson { get; set; }  // JSON array of issue description strings
    public bool IsReviewed { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
}
