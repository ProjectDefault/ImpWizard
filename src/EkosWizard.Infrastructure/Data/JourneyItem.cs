namespace ImpWizard.Infrastructure.Data;

public class JourneyItem
{
    public int Id { get; set; }
    public int JourneyStageId { get; set; }
    public JourneyStage Stage { get; set; } = null!;
    public string ItemType { get; set; } = string.Empty; // "Meeting" | "Resource" | "FormAssignment"
    public int SortOrder { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Meeting fields
    public string? MeetingType { get; set; }
    public string? MeetingPurpose { get; set; }
    public string? MeetingGoals { get; set; }
    public int? DefaultDurationMinutes { get; set; }

    // Resource fields
    public string? ResourceType { get; set; } // "GoogleSlides" | "Video" | "Document" | "Link" | "CustomerSuccess" | "TechnicalSupport"
    public string? ResourceUrl { get; set; }
    public string? ResourceLabel { get; set; }

    // FormAssignment fields
    public int? FormId { get; set; }
    public Form? Form { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
