namespace ImpWizard.Infrastructure.Data;

public class JourneyStage
{
    public int Id { get; set; }
    public int JourneyId { get; set; }
    public Journey Journey { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public int? StageCategoryId { get; set; }
    public JourneyStageCategory? StageCategory { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<JourneyItem> Items { get; set; } = [];
}
