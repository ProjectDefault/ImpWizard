using System.ComponentModel.DataAnnotations;

namespace ImpWizard.Infrastructure.Data;

public class AuditLogEntry
{
    public long Id { get; set; }
    public DateTime Timestamp { get; set; }

    // Snapshot fields — no FK navigation properties intentionally
    public string UserId { get; set; } = string.Empty;
    public string UserFullName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;

    // Action dot-notation: "project.created", "meeting.deleted", etc.
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? EntityName { get; set; }

    // Nullable — null for system-level (non-project) actions
    public int? ProjectId { get; set; }
    public string? ProjectName { get; set; }

    // Human-readable summary e.g. "Status changed from Active to Complete"
    public string? Detail { get; set; }
}
