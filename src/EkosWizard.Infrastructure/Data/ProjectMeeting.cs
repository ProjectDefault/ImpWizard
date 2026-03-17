namespace ImpWizard.Infrastructure.Data;

public class ProjectMeeting
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public int? JourneyItemId { get; set; }
    public JourneyItem? JourneyItem { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? MeetingType { get; set; }
    public string? Purpose { get; set; }
    public string? Description { get; set; }
    public string? Goals { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public int? DurationMinutes { get; set; }
    public string Status { get; set; } = "Scheduled";
    public string? MeetingUrl { get; set; }
    public string? RecordingUrl { get; set; }
    public int SortOrder { get; set; }
    public string? ScheduledByUserId { get; set; }
    public ApplicationUser? ScheduledBy { get; set; }
    public string? ZoomMeetingId { get; set; }
    public string? ZoomJoinUrl { get; set; }
    public string? GongCallId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
