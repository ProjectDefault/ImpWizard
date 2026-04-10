using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize(Roles = "Admin,CIS")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public ProjectsController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record SpecialistDto(string Id, string Name, string Email);
    public record ProjectUserAccessDto(int Id, string UserId, string UserName, string Email, string Role, DateTime GrantedAt);
    public record GrantAccessRequest(string UserId, string Role);

    public record ProjectDto(
        int Id,
        string ProjectType,
        string CustomerName,
        string? SalesforceAccountId,
        string? SalesforceProjectId,
        SpecialistDto? AssignedSpecialist,
        string Status,
        int CurrentStep,
        int? ProgramId,
        string? AddressLine1,
        string? AddressLine2,
        string? City,
        string? StateProvince,
        string? PostalCode,
        string? Country,
        string? Timezone,
        DateTime CreatedAt,
        DateTime UpdatedAt);

    public record CreateProjectRequest(
        string ProjectType,
        string CustomerName,
        string? SalesforceAccountId,
        string? SalesforceProjectId,
        string? AssignedSpecialistId,
        int? ProgramId);

    public record UpdateProjectRequest(
        string? CustomerName,
        string? SalesforceAccountId,
        string? SalesforceProjectId,
        string? AssignedSpecialistId,
        string? Status,
        // Only Admin may change these
        string? ProjectType,
        int? ProgramId,
        // Address & locale
        string? AddressLine1,
        string? AddressLine2,
        string? City,
        string? StateProvince,
        string? PostalCode,
        string? Country,
        string? Timezone);

    // Journey assignment
    public record AssignJourneyRequest(int JourneyId, string? Notes = null,
        string? SalesforceOpportunityId = null, string? ChurnZeroAccountId = null);
    public record UpdateJourneyIntegrationRequest(string? SalesforceOpportunityId, string? ChurnZeroAccountId);
    public record StageProgressDto(int StageId, string StageName, string? Color, string? Icon,
        string StageCategory, string Status, int CompletedItems, int TotalItems);
    public record JourneyAssignmentSummaryDto(int AssignmentId, int JourneyId, string JourneyName,
        DateTime AssignedAt, IEnumerable<StageProgressDto> StageProgress,
        int TotalMeetings, int CompletedMeetings, int TotalForms, int SubmittedForms, int TotalResources,
        // Integration hooks
        string? SalesforceOpportunityId, string? ChurnZeroAccountId);

    // Meetings
    public record ProjectMeetingDto(int Id, string Title, string? MeetingType, string? Purpose,
        string? Description, string? Goals, DateTime? ScheduledAt, int? DurationMinutes,
        string Status, string? MeetingUrl, string? RecordingUrl, int SortOrder, int? JourneyItemId,
        // Integration hooks
        string? ZoomMeetingId, string? ZoomJoinUrl, string? GongCallId);
    public record CreateMeetingRequest(string Title, string? MeetingType, string? Purpose,
        string? Description, string? Goals, DateTime? ScheduledAt, int? DurationMinutes,
        string? MeetingUrl, int SortOrder = 0,
        string? ZoomMeetingId = null, string? ZoomJoinUrl = null, string? GongCallId = null);
    public record UpdateMeetingRequest(string? Title, string? MeetingType, string? Purpose,
        string? Description, string? Goals, DateTime? ScheduledAt, int? DurationMinutes,
        string? MeetingUrl, string? RecordingUrl, int? SortOrder,
        string? ZoomMeetingId = null, string? ZoomJoinUrl = null, string? GongCallId = null);
    public record UpdateMeetingStatusRequest(string Status);

    // Resources
    public record ProjectResourceDto(int Id, string Title, string? ResourceType, string ResourceUrl,
        int SortOrder, int? JourneyItemId,
        // Integration hooks
        string? GoogleDriveFileId);
    public record CreateResourceRequest(string Title, string? ResourceType, string ResourceUrl, int SortOrder = 0,
        string? GoogleDriveFileId = null);
    public record UpdateResourceRequest(string? Title, string? ResourceType, string? ResourceUrl, int? SortOrder,
        string? GoogleDriveFileId = null);

    // Form Assignments
    public record ProjectFormAssignmentDto(int Id, int FormId, string FormName, string Status,
        string? AssignedToUserId, string? AssignedToName, int SortOrder, int? JourneyItemId, string? Notes);
    public record CreateFormAssignmentRequest(int FormId, string? AssignedToUserId, int SortOrder = 0, string? Notes = null);
    public record UpdateFormAssignmentRequest(string? Status, string? AssignedToUserId, int? SortOrder, string? Notes);

    // Activity
    public record ResourceActivityDto(int ResourceId, string Title, string? ResourceType, long ViewCount, long UniqueViewers);
    public record MeetingActivityDto(int MeetingId, string Title, string? MeetingType, string Status, long ClickCount, long UniqueClickers);
    public record FormActivityDto(int FormAssignmentId, string FormName, string Status, string? AssignedToName);
    public record ProjectActivityDto(
        IEnumerable<ResourceActivityDto> Resources,
        IEnumerable<MeetingActivityDto> Meetings,
        IEnumerable<FormActivityDto> Forms);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ProjectDto ToDto(ImplementationProject p) => new(
        p.Id, p.ProjectType, p.CustomerName,
        p.SalesforceAccountId, p.SalesforceProjectId,
        p.AssignedSpecialist is null ? null
            : new SpecialistDto(p.AssignedSpecialist.Id, p.AssignedSpecialist.FullName, p.AssignedSpecialist.Email ?? ""),
        p.Status, p.CurrentStep, p.ProgramId,
        p.AddressLine1, p.AddressLine2, p.City, p.StateProvince, p.PostalCode, p.Country, p.Timezone,
        p.CreatedAt, p.UpdatedAt);

    private bool IsAdmin() => User.IsInRole("Admin");

    private async Task<IEnumerable<StageProgressDto>> ComputeStageProgress(int projectId, int journeyId)
    {
        var stages = await _db.JourneyStages
            .Where(s => s.JourneyId == journeyId)
            .OrderBy(s => s.SortOrder)
            .Include(s => s.StageCategory)
            .Include(s => s.Items)
            .ToListAsync();

        var meetings = await _db.ProjectMeetings
            .Where(m => m.ProjectId == projectId && m.JourneyItemId != null)
            .ToListAsync();

        var forms = await _db.ProjectFormAssignments
            .Where(f => f.ProjectId == projectId && f.JourneyItemId != null)
            .ToListAsync();

        var result = new List<StageProgressDto>();
        foreach (var stage in stages)
        {
            var stageItemIds = stage.Items.Select(i => i.Id).ToHashSet();
            var stageMeetings = meetings.Where(m => stageItemIds.Contains(m.JourneyItemId!.Value)).ToList();
            var stageForms = forms.Where(f => stageItemIds.Contains(f.JourneyItemId!.Value)).ToList();

            int total = stageMeetings.Count + stageForms.Count;
            int completed = stageMeetings.Count(m => m.Status == "Completed") + stageForms.Count(f => f.Status == "Submitted");

            string status = total == 0 ? "NotStarted" : completed == total ? "Complete" : completed > 0 ? "InProgress" : "NotStarted";

            result.Add(new StageProgressDto(stage.Id, stage.Name, stage.Color, stage.Icon,
                stage.StageCategory?.Name ?? "", status, completed, total));
        }
        return result;
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var projects = await _db.Projects
            .Include(p => p.AssignedSpecialist)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(projects.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var project = await _db.Projects
            .Include(p => p.AssignedSpecialist)
            .FirstOrDefaultAsync(p => p.Id == id);

        return project is null ? NotFound() : Ok(ToDto(project));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.CustomerName))
            return BadRequest(new { message = "Customer name is required." });

        var project = new ImplementationProject
        {
            ProjectType = req.ProjectType,
            CustomerName = req.CustomerName.Trim(),
            SalesforceAccountId = req.SalesforceAccountId?.Trim(),
            SalesforceProjectId = req.SalesforceProjectId?.Trim(),
            AssignedSpecialistId = req.AssignedSpecialistId,
            ProgramId = req.ProgramId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.created", "Project", project.Id.ToString(), project.CustomerName);

        await _db.Entry(project).Reference(p => p.AssignedSpecialist).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = project.Id }, ToDto(project));
    }

    // ── User Access Endpoints ─────────────────────────────────────────────────

    [HttpGet("{id:int}/users")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetProjectUsers(int id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var accesses = await _db.ProjectUserAccess
            .Where(a => a.ProjectId == id)
            .Join(_db.Users,
                a => a.UserId,
                u => u.Id,
                (a, u) => new ProjectUserAccessDto(a.Id, a.UserId, u.FullName, u.Email ?? "", a.Role, a.GrantedAt))
            .ToListAsync();

        return Ok(accesses);
    }

    [HttpPost("{id:int}/users")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GrantAccess(int id, [FromBody] GrantAccessRequest req)
    {
        if (req.Role != "SuperCustomer" && req.Role != "Customer")
            return BadRequest(new { message = "Role must be 'SuperCustomer' or 'Customer'." });

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == req.UserId);
        if (targetUser is null) return BadRequest(new { message = "User not found." });

        var exists = await _db.ProjectUserAccess
            .AnyAsync(a => a.ProjectId == id && a.UserId == req.UserId);
        if (exists) return Conflict(new { message = "User already has access to this project." });

        var grantedByUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        var access = new ProjectUserAccess
        {
            ProjectId = id,
            UserId = req.UserId,
            Role = req.Role,
            GrantedAt = DateTime.UtcNow,
            GrantedByUserId = grantedByUserId,
        };

        _db.ProjectUserAccess.Add(access);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.access_granted", "ProjectUserAccess", access.Id.ToString(), targetUser.FullName,
            projectId: id, projectName: project.CustomerName);

        return Ok(new ProjectUserAccessDto(access.Id, access.UserId, targetUser.FullName, targetUser.Email ?? "", access.Role, access.GrantedAt));
    }

    [HttpDelete("{id:int}/users/{userId}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> RevokeAccess(int id, string userId)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var access = await _db.ProjectUserAccess
            .FirstOrDefaultAsync(a => a.ProjectId == id && a.UserId == userId);

        if (access is null) return NotFound();

        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        var userName = targetUser?.FullName ?? userId;

        _db.ProjectUserAccess.Remove(access);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.access_revoked", "ProjectUserAccess", access.Id.ToString(), userName,
            projectId: id, projectName: project.CustomerName);

        return NoContent();
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectRequest req)
    {
        var project = await _db.Projects
            .Include(p => p.AssignedSpecialist)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project is null) return NotFound();

        // CIS cannot change ProjectType or Salesforce IDs
        if (IsAdmin())
        {
            if (req.ProjectType is not null) project.ProjectType = req.ProjectType;
            if (req.SalesforceAccountId is not null) project.SalesforceAccountId = req.SalesforceAccountId.Trim();
            if (req.SalesforceProjectId is not null) project.SalesforceProjectId = req.SalesforceProjectId.Trim();
        }

        if (req.CustomerName is not null) project.CustomerName = req.CustomerName.Trim();
        if (req.AssignedSpecialistId is not null) project.AssignedSpecialistId = req.AssignedSpecialistId;
        if (req.Status is not null) project.Status = req.Status;
        if (req.ProgramId is not null) project.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;

        // Address & locale — empty string clears the field
        if (req.AddressLine1 is not null) project.AddressLine1 = req.AddressLine1.Trim().Length > 0 ? req.AddressLine1.Trim() : null;
        if (req.AddressLine2 is not null) project.AddressLine2 = req.AddressLine2.Trim().Length > 0 ? req.AddressLine2.Trim() : null;
        if (req.City is not null) project.City = req.City.Trim().Length > 0 ? req.City.Trim() : null;
        if (req.StateProvince is not null) project.StateProvince = req.StateProvince.Trim().Length > 0 ? req.StateProvince.Trim() : null;
        if (req.PostalCode is not null) project.PostalCode = req.PostalCode.Trim().Length > 0 ? req.PostalCode.Trim() : null;
        if (req.Country is not null) project.Country = req.Country.Trim().Length > 0 ? req.Country.Trim() : null;
        if (req.Timezone is not null) project.Timezone = req.Timezone.Trim().Length > 0 ? req.Timezone.Trim() : null;

        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.updated", "Project", project.Id.ToString(), project.CustomerName);
        await _db.Entry(project).Reference(p => p.AssignedSpecialist).LoadAsync();

        return Ok(ToDto(project));
    }

    // ── Journey Assignment Endpoints ──────────────────────────────────────────

    [HttpPost("{id:int}/assign-journey")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> AssignJourney(int id, [FromBody] AssignJourneyRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound(new { message = "Project not found." });

        var journey = await _db.Journeys
            .Include(j => j.Stages.OrderBy(s => s.SortOrder))
                .ThenInclude(s => s.Items.OrderBy(i => i.SortOrder))
            .FirstOrDefaultAsync(j => j.Id == req.JourneyId);
        if (journey is null) return BadRequest(new { message = "Journey not found." });

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var now = DateTime.UtcNow;

        var assignment = new ProjectJourneyAssignment
        {
            ProjectId = id,
            JourneyId = req.JourneyId,
            AssignedAt = now,
            AssignedByUserId = userId,
            Notes = req.Notes,
            SalesforceOpportunityId = req.SalesforceOpportunityId,
            ChurnZeroAccountId = req.ChurnZeroAccountId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.ProjectJourneyAssignments.Add(assignment);

        foreach (var stage in journey.Stages)
        {
            foreach (var item in stage.Items)
            {
                switch (item.ItemType)
                {
                    case "Meeting":
                        _db.ProjectMeetings.Add(new ProjectMeeting
                        {
                            ProjectId = id,
                            JourneyItemId = item.Id,
                            Title = item.Title,
                            MeetingType = item.MeetingType,
                            Purpose = item.MeetingPurpose,
                            Goals = item.MeetingGoals,
                            Description = item.Description,
                            DurationMinutes = item.DefaultDurationMinutes,
                            SortOrder = item.SortOrder,
                            Status = "Scheduled",
                            CreatedAt = now,
                            UpdatedAt = now,
                        });
                        break;
                    case "Resource":
                        _db.ProjectResources.Add(new ProjectResource
                        {
                            ProjectId = id,
                            JourneyItemId = item.Id,
                            Title = item.Title,
                            ResourceType = item.ResourceType,
                            ResourceUrl = item.ResourceUrl ?? string.Empty,
                            SortOrder = item.SortOrder,
                            CreatedAt = now,
                            UpdatedAt = now,
                        });
                        break;
                    case "FormAssignment":
                        if (item.FormId.HasValue)
                        {
                            _db.ProjectFormAssignments.Add(new ProjectFormAssignment
                            {
                                ProjectId = id,
                                JourneyItemId = item.Id,
                                FormId = item.FormId.Value,
                                SortOrder = item.SortOrder,
                                Status = "NotStarted",
                                CreatedAt = now,
                                UpdatedAt = now,
                            });
                        }
                        break;
                }
            }
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.journey_assigned", "ProjectJourneyAssignment", assignment.Id.ToString(), journey.Name,
            projectId: id, projectName: project.CustomerName);

        var stageProgress = await ComputeStageProgress(id, req.JourneyId);
        var totalMeetings = await _db.ProjectMeetings.CountAsync(m => m.ProjectId == id);
        var completedMeetings = await _db.ProjectMeetings.CountAsync(m => m.ProjectId == id && m.Status == "Completed");
        var totalForms = await _db.ProjectFormAssignments.CountAsync(f => f.ProjectId == id);
        var submittedForms = await _db.ProjectFormAssignments.CountAsync(f => f.ProjectId == id && f.Status == "Submitted");
        var totalResources = await _db.ProjectResources.CountAsync(r => r.ProjectId == id);

        return Ok(new JourneyAssignmentSummaryDto(
            assignment.Id, journey.Id, journey.Name, assignment.AssignedAt,
            stageProgress, totalMeetings, completedMeetings, totalForms, submittedForms, totalResources,
            assignment.SalesforceOpportunityId, assignment.ChurnZeroAccountId));
    }

    [HttpGet("{id:int}/journey")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetJourneyAssignment(int id)
    {
        var assignment = await _db.ProjectJourneyAssignments
            .Include(a => a.Journey)
            .FirstOrDefaultAsync(a => a.ProjectId == id);

        if (assignment is null) return NotFound();

        var stageProgress = await ComputeStageProgress(id, assignment.JourneyId);
        var totalMeetings = await _db.ProjectMeetings.CountAsync(m => m.ProjectId == id);
        var completedMeetings = await _db.ProjectMeetings.CountAsync(m => m.ProjectId == id && m.Status == "Completed");
        var totalForms = await _db.ProjectFormAssignments.CountAsync(f => f.ProjectId == id);
        var submittedForms = await _db.ProjectFormAssignments.CountAsync(f => f.ProjectId == id && f.Status == "Submitted");
        var totalResources = await _db.ProjectResources.CountAsync(r => r.ProjectId == id);

        return Ok(new JourneyAssignmentSummaryDto(
            assignment.Id, assignment.Journey.Id, assignment.Journey.Name, assignment.AssignedAt,
            stageProgress, totalMeetings, completedMeetings, totalForms, submittedForms, totalResources,
            assignment.SalesforceOpportunityId, assignment.ChurnZeroAccountId));
    }

    [HttpDelete("{id:int}/journey")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveJourneyAssignment(int id)
    {
        var assignment = await _db.ProjectJourneyAssignments
            .Include(a => a.Journey)
            .FirstOrDefaultAsync(a => a.ProjectId == id);

        if (assignment is null) return NotFound();

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        var journeyName = assignment.Journey?.Name;

        _db.ProjectJourneyAssignments.Remove(assignment);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ── Meeting Endpoints ─────────────────────────────────────────────────────

    [HttpGet("{id:int}/meetings")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetMeetings(int id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var meetings = await _db.ProjectMeetings
            .Where(m => m.ProjectId == id)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        return Ok(meetings.Select(m => new ProjectMeetingDto(
            m.Id, m.Title, m.MeetingType, m.Purpose, m.Description, m.Goals,
            m.ScheduledAt, m.DurationMinutes, m.Status, m.MeetingUrl, m.RecordingUrl,
            m.SortOrder, m.JourneyItemId, m.ZoomMeetingId, m.ZoomJoinUrl, m.GongCallId)));
    }

    [HttpPost("{id:int}/meetings")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> CreateMeeting(int id, [FromBody] CreateMeetingRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var now = DateTime.UtcNow;
        var meeting = new ProjectMeeting
        {
            ProjectId = id,
            Title = req.Title,
            MeetingType = req.MeetingType,
            Purpose = req.Purpose,
            Description = req.Description,
            Goals = req.Goals,
            ScheduledAt = req.ScheduledAt,
            DurationMinutes = req.DurationMinutes,
            MeetingUrl = req.MeetingUrl,
            SortOrder = req.SortOrder,
            Status = "Scheduled",
            ZoomMeetingId = req.ZoomMeetingId,
            ZoomJoinUrl = req.ZoomJoinUrl,
            GongCallId = req.GongCallId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.ProjectMeetings.Add(meeting);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.meeting_created", "ProjectMeeting", meeting.Id.ToString(), meeting.Title,
            projectId: id, projectName: project.CustomerName);

        return Ok(new ProjectMeetingDto(
            meeting.Id, meeting.Title, meeting.MeetingType, meeting.Purpose, meeting.Description, meeting.Goals,
            meeting.ScheduledAt, meeting.DurationMinutes, meeting.Status, meeting.MeetingUrl, meeting.RecordingUrl,
            meeting.SortOrder, meeting.JourneyItemId, meeting.ZoomMeetingId, meeting.ZoomJoinUrl, meeting.GongCallId));
    }

    [HttpPut("{id:int}/meetings/{mid:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> UpdateMeeting(int id, int mid, [FromBody] UpdateMeetingRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var meeting = await _db.ProjectMeetings.FirstOrDefaultAsync(m => m.Id == mid && m.ProjectId == id);
        if (meeting is null) return NotFound();

        if (req.Title is not null) meeting.Title = req.Title;
        if (req.MeetingType is not null) meeting.MeetingType = req.MeetingType;
        if (req.Purpose is not null) meeting.Purpose = req.Purpose;
        if (req.Description is not null) meeting.Description = req.Description;
        if (req.Goals is not null) meeting.Goals = req.Goals;
        if (req.ScheduledAt.HasValue) meeting.ScheduledAt = req.ScheduledAt;
        if (req.DurationMinutes.HasValue) meeting.DurationMinutes = req.DurationMinutes;
        if (req.MeetingUrl is not null) meeting.MeetingUrl = req.MeetingUrl;
        if (req.RecordingUrl is not null) meeting.RecordingUrl = req.RecordingUrl;
        if (req.SortOrder.HasValue) meeting.SortOrder = req.SortOrder.Value;
        if (req.ZoomMeetingId is not null) meeting.ZoomMeetingId = req.ZoomMeetingId;
        if (req.ZoomJoinUrl is not null) meeting.ZoomJoinUrl = req.ZoomJoinUrl;
        if (req.GongCallId is not null) meeting.GongCallId = req.GongCallId;
        meeting.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.meeting_updated", "ProjectMeeting", meeting.Id.ToString(), meeting.Title,
            projectId: id, projectName: project.CustomerName);

        return Ok(new ProjectMeetingDto(
            meeting.Id, meeting.Title, meeting.MeetingType, meeting.Purpose, meeting.Description, meeting.Goals,
            meeting.ScheduledAt, meeting.DurationMinutes, meeting.Status, meeting.MeetingUrl, meeting.RecordingUrl,
            meeting.SortOrder, meeting.JourneyItemId, meeting.ZoomMeetingId, meeting.ZoomJoinUrl, meeting.GongCallId));
    }

    [HttpDelete("{id:int}/meetings/{mid:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> DeleteMeeting(int id, int mid)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var meeting = await _db.ProjectMeetings.FirstOrDefaultAsync(m => m.Id == mid && m.ProjectId == id);
        if (meeting is null) return NotFound();

        var title = meeting.Title;
        _db.ProjectMeetings.Remove(meeting);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.meeting_deleted", "ProjectMeeting", mid.ToString(), title,
            projectId: id, projectName: project.CustomerName);
        return NoContent();
    }

    [HttpPut("{id:int}/meetings/{mid:int}/status")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> UpdateMeetingStatus(int id, int mid, [FromBody] UpdateMeetingStatusRequest req)
    {
        if (req.Status != "Scheduled" && req.Status != "Completed" && req.Status != "Cancelled")
            return BadRequest(new { message = "Status must be 'Scheduled', 'Completed', or 'Cancelled'." });

        var meeting = await _db.ProjectMeetings.FirstOrDefaultAsync(m => m.Id == mid && m.ProjectId == id);
        if (meeting is null) return NotFound();

        meeting.Status = req.Status;
        meeting.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new ProjectMeetingDto(
            meeting.Id, meeting.Title, meeting.MeetingType, meeting.Purpose, meeting.Description, meeting.Goals,
            meeting.ScheduledAt, meeting.DurationMinutes, meeting.Status, meeting.MeetingUrl, meeting.RecordingUrl,
            meeting.SortOrder, meeting.JourneyItemId, meeting.ZoomMeetingId, meeting.ZoomJoinUrl, meeting.GongCallId));
    }

    // ── Resource Endpoints ────────────────────────────────────────────────────

    [HttpGet("{id:int}/resources")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetResources(int id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var resources = await _db.ProjectResources
            .Where(r => r.ProjectId == id)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        return Ok(resources.Select(r => new ProjectResourceDto(
            r.Id, r.Title, r.ResourceType, r.ResourceUrl, r.SortOrder, r.JourneyItemId, r.GoogleDriveFileId)));
    }

    [HttpPost("{id:int}/resources")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> CreateResource(int id, [FromBody] CreateResourceRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var now = DateTime.UtcNow;
        var resource = new ProjectResource
        {
            ProjectId = id,
            Title = req.Title,
            ResourceType = req.ResourceType,
            ResourceUrl = req.ResourceUrl,
            SortOrder = req.SortOrder,
            GoogleDriveFileId = req.GoogleDriveFileId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.ProjectResources.Add(resource);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.resource_created", "ProjectResource", resource.Id.ToString(), resource.Title,
            projectId: id, projectName: project.CustomerName);

        return Ok(new ProjectResourceDto(resource.Id, resource.Title, resource.ResourceType, resource.ResourceUrl, resource.SortOrder, resource.JourneyItemId, resource.GoogleDriveFileId));
    }

    [HttpPut("{id:int}/resources/{rid:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> UpdateResource(int id, int rid, [FromBody] UpdateResourceRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var resource = await _db.ProjectResources.FirstOrDefaultAsync(r => r.Id == rid && r.ProjectId == id);
        if (resource is null) return NotFound();

        if (req.Title is not null) resource.Title = req.Title;
        if (req.ResourceType is not null) resource.ResourceType = req.ResourceType;
        if (req.ResourceUrl is not null) resource.ResourceUrl = req.ResourceUrl;
        if (req.SortOrder.HasValue) resource.SortOrder = req.SortOrder.Value;
        if (req.GoogleDriveFileId is not null) resource.GoogleDriveFileId = req.GoogleDriveFileId;
        resource.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.resource_updated", "ProjectResource", resource.Id.ToString(), resource.Title,
            projectId: id, projectName: project.CustomerName);

        return Ok(new ProjectResourceDto(resource.Id, resource.Title, resource.ResourceType, resource.ResourceUrl, resource.SortOrder, resource.JourneyItemId, resource.GoogleDriveFileId));
    }

    [HttpDelete("{id:int}/resources/{rid:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> DeleteResource(int id, int rid)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var resource = await _db.ProjectResources.FirstOrDefaultAsync(r => r.Id == rid && r.ProjectId == id);
        if (resource is null) return NotFound();

        var title = resource.Title;
        _db.ProjectResources.Remove(resource);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.resource_deleted", "ProjectResource", rid.ToString(), title,
            projectId: id, projectName: project.CustomerName);
        return NoContent();
    }

    // ── Form Assignment Endpoints ──────────────────────────────────────────────

    [HttpGet("{id:int}/form-assignments")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetFormAssignments(int id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var assignments = await _db.ProjectFormAssignments
            .Where(f => f.ProjectId == id)
            .Include(f => f.Form)
            .OrderBy(f => f.SortOrder)
            .ToListAsync();

        var userIds = assignments
            .Where(a => a.AssignedToUserId != null)
            .Select(a => a.AssignedToUserId!)
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(assignments.Select(f => new ProjectFormAssignmentDto(
            f.Id, f.FormId, f.Form.Name, f.Status,
            f.AssignedToUserId,
            f.AssignedToUserId != null && users.TryGetValue(f.AssignedToUserId, out var name) ? name : null,
            f.SortOrder, f.JourneyItemId, f.Notes)));
    }

    [HttpPost("{id:int}/form-assignments")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> CreateFormAssignment(int id, [FromBody] CreateFormAssignmentRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var form = await _db.Forms.FirstOrDefaultAsync(f => f.Id == req.FormId);
        if (form is null) return BadRequest(new { message = "Form not found." });

        var now = DateTime.UtcNow;
        var assignment = new ProjectFormAssignment
        {
            ProjectId = id,
            FormId = req.FormId,
            AssignedToUserId = req.AssignedToUserId,
            SortOrder = req.SortOrder,
            Notes = req.Notes,
            Status = "NotStarted",
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.ProjectFormAssignments.Add(assignment);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.form_assigned", "ProjectFormAssignment", assignment.Id.ToString(), form.Name,
            projectId: id, projectName: project.CustomerName);

        string? assignedToName = null;
        if (req.AssignedToUserId != null)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == req.AssignedToUserId);
            assignedToName = user?.FullName;
        }

        return Ok(new ProjectFormAssignmentDto(
            assignment.Id, assignment.FormId, form.Name, assignment.Status,
            assignment.AssignedToUserId, assignedToName,
            assignment.SortOrder, assignment.JourneyItemId, assignment.Notes));
    }

    [HttpPut("{id:int}/form-assignments/{faid:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> UpdateFormAssignment(int id, int faid, [FromBody] UpdateFormAssignmentRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var assignment = await _db.ProjectFormAssignments
            .Include(f => f.Form)
            .FirstOrDefaultAsync(f => f.Id == faid && f.ProjectId == id);
        if (assignment is null) return NotFound();

        if (req.Status is not null) assignment.Status = req.Status;
        if (req.AssignedToUserId is not null) assignment.AssignedToUserId = req.AssignedToUserId;
        if (req.SortOrder.HasValue) assignment.SortOrder = req.SortOrder.Value;
        if (req.Notes is not null) assignment.Notes = req.Notes;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.form_updated", "ProjectFormAssignment", assignment.Id.ToString(), assignment.Form.Name,
            projectId: id, projectName: project.CustomerName);

        string? assignedToName = null;
        if (assignment.AssignedToUserId != null)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == assignment.AssignedToUserId);
            assignedToName = user?.FullName;
        }

        return Ok(new ProjectFormAssignmentDto(
            assignment.Id, assignment.FormId, assignment.Form.Name, assignment.Status,
            assignment.AssignedToUserId, assignedToName,
            assignment.SortOrder, assignment.JourneyItemId, assignment.Notes));
    }

    // ── Journey Integration Hooks ─────────────────────────────────────────────

    [HttpPatch("{id:int}/journey/integration")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> UpdateJourneyIntegration(int id, [FromBody] UpdateJourneyIntegrationRequest req)
    {
        var assignment = await _db.ProjectJourneyAssignments
            .Include(a => a.Journey)
            .FirstOrDefaultAsync(a => a.ProjectId == id);
        if (assignment is null) return NotFound();

        if (req.SalesforceOpportunityId is not null) assignment.SalesforceOpportunityId = req.SalesforceOpportunityId;
        if (req.ChurnZeroAccountId is not null) assignment.ChurnZeroAccountId = req.ChurnZeroAccountId;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var stageProgress = await ComputeStageProgress(id, assignment.JourneyId);
        var totalMeetings = await _db.ProjectMeetings.CountAsync(m => m.ProjectId == id);
        var completedMeetings = await _db.ProjectMeetings.CountAsync(m => m.ProjectId == id && m.Status == "Completed");
        var totalForms = await _db.ProjectFormAssignments.CountAsync(f => f.ProjectId == id);
        var submittedForms = await _db.ProjectFormAssignments.CountAsync(f => f.ProjectId == id && f.Status == "Submitted");
        var totalResources = await _db.ProjectResources.CountAsync(r => r.ProjectId == id);

        return Ok(new JourneyAssignmentSummaryDto(
            assignment.Id, assignment.Journey.Id, assignment.Journey.Name, assignment.AssignedAt,
            stageProgress, totalMeetings, completedMeetings, totalForms, submittedForms, totalResources,
            assignment.SalesforceOpportunityId, assignment.ChurnZeroAccountId));
    }

    [HttpDelete("{id:int}/form-assignments/{faid:int}")]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> DeleteFormAssignment(int id, int faid)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var assignment = await _db.ProjectFormAssignments
            .Include(f => f.Form)
            .FirstOrDefaultAsync(f => f.Id == faid && f.ProjectId == id);
        if (assignment is null) return NotFound();

        var formName = assignment.Form.Name;
        _db.ProjectFormAssignments.Remove(assignment);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "project.form_deleted", "ProjectFormAssignment", faid.ToString(), formName,
            projectId: id, projectName: project.CustomerName);
        return NoContent();
    }

    // GET /api/projects/{id}/activity
    [HttpGet("{id:int}/activity")]
    public async Task<IActionResult> GetActivity(int id)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        // Resource view counts
        var resources = await _db.ProjectResources
            .Where(r => r.ProjectId == id)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        var resourceViewCounts = await _db.ResourceViewEvents
            .Where(e => e.ProjectId == id)
            .GroupBy(e => e.ResourceId)
            .Select(g => new { ResourceId = g.Key, Total = (long)g.Count(), Unique = (long)g.Select(e => e.UserId).Distinct().Count() })
            .ToListAsync();

        var resourceActivityMap = resourceViewCounts.ToDictionary(r => r.ResourceId);

        var resourceActivity = resources.Select(r =>
        {
            resourceActivityMap.TryGetValue(r.Id, out var counts);
            return new ResourceActivityDto(r.Id, r.Title, r.ResourceType, counts?.Total ?? 0, counts?.Unique ?? 0);
        });

        // Meeting click counts
        var meetings = await _db.ProjectMeetings
            .Where(m => m.ProjectId == id)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        var meetingClickCounts = await _db.MeetingLinkClickEvents
            .Where(e => e.ProjectId == id)
            .GroupBy(e => e.MeetingId)
            .Select(g => new { MeetingId = g.Key, Total = (long)g.Count(), Unique = (long)g.Select(e => e.UserId).Distinct().Count() })
            .ToListAsync();

        var meetingActivityMap = meetingClickCounts.ToDictionary(m => m.MeetingId);

        var meetingActivity = meetings.Select(m =>
        {
            meetingActivityMap.TryGetValue(m.Id, out var counts);
            return new MeetingActivityDto(m.Id, m.Title, m.MeetingType, m.Status, counts?.Total ?? 0, counts?.Unique ?? 0);
        });

        // Form statuses
        var formAssignments = await _db.ProjectFormAssignments
            .Where(f => f.ProjectId == id)
            .Include(f => f.Form)
            .OrderBy(f => f.SortOrder)
            .ToListAsync();

        var assignedUserIds = formAssignments
            .Where(f => f.AssignedToUserId != null)
            .Select(f => f.AssignedToUserId!)
            .Distinct()
            .ToList();

        var userNames = await _db.Users
            .Where(u => assignedUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        var formActivity = formAssignments.Select(f =>
        {
            string? assignedToName = f.AssignedToUserId != null && userNames.TryGetValue(f.AssignedToUserId, out var name) ? name : null;
            return new FormActivityDto(f.Id, f.Form.Name, f.Status, assignedToName);
        });

        return Ok(new ProjectActivityDto(resourceActivity, meetingActivity, formActivity));
    }
}
