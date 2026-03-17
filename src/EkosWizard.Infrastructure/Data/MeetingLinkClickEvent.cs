namespace ImpWizard.Infrastructure.Data;

public class MeetingLinkClickEvent
{
    public long Id { get; set; }
    public int MeetingId { get; set; }
    public ProjectMeeting Meeting { get; set; } = null!;
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public DateTime ClickedAt { get; set; }
}
