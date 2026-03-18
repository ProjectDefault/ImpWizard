using System.Security.Claims;
using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/portal")]
[Authorize(Roles = "Admin,CIS,SuperCustomer,Customer")]
public class PortalController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public PortalController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record PortalProjectDto(int Id, string Name, string? Status, string? ProgramName,
        string? ProgramColor, bool HasJourney, IEnumerable<StageProgressDto> StageProgress);

    public record StageProgressDto(int StageId, string StageName, string? Color, string? Icon,
        string StageCategory, string Status, int CompletedItems, int TotalItems);

    public record PortalMeetingDto(int Id, string Title, string? MeetingType, string? Purpose,
        string? Description, string? Goals, DateTime? ScheduledAt, int? DurationMinutes,
        string Status, string? MeetingUrl, string? RecordingUrl, int SortOrder);

    public record PortalResourceDto(int Id, string Title, string? ResourceType, string ResourceUrl,
        int SortOrder);

    public record PortalFormAssignmentDto(int Id, int FormId, string FormName, string Status,
        string? AssignedToUserId, string? AssignedToName, int SortOrder, string? Notes);

    public record PortalTeamMemberDto(int AccessId, string UserId, string Name, string Email, string Role);

    public record InviteRequest(string UserId, string Role);
    public record AssignFormRequest(string? AssignedToUserId);

    public record FormSubmissionDto(
        int Id, int ProjectFormAssignmentId, string Status, DateTime? SubmittedAt,
        DateTime CreatedAt, DateTime UpdatedAt,
        IEnumerable<FormSubmissionAnswerDto> Answers);

    public record FormSubmissionAnswerDto(int Id, int FormFieldId, string Value);

    public record FormWithFieldsDto(
        int Id, string Name, string? Description, string Status,
        bool AllowFileSubmission,
        IEnumerable<FormFieldForFillDto> Fields);

    public record FormFieldForFillDto(
        int Id, string Label, string FieldType, bool IsRequired, int SortOrder,
        string DataSourceType, int? DataSourceId, int? MaxLength,
        int? CrossFormPreFillFormId, int? CrossFormPreFillFieldId,
        int? DataSourceFormId, int? DataSourceFieldId,
        bool AllowCustomValue, string? AutoFillValue);

    public record ProjectSubmissionFormDto(
        int FormId, string FormName,
        IEnumerable<ProjectSubmissionRowDto> Submissions);

    public record ProjectSubmissionRowDto(
        int SubmissionId, string? SubmittedByName, DateTime? SubmittedAt,
        IEnumerable<ProjectSubmissionAnswerDto> Answers);

    public record ProjectSubmissionAnswerDto(
        int AnswerId, int FieldId, string FieldLabel, string Value);

    public record UpdateAnswerRequest(string Value);

    public record SaveDraftRequest(IEnumerable<AnswerInput> Answers);
    public record AnswerInput(int FormFieldId, string Value);
    public record TrackClickRequest(string? LinkType = null); // "join" | "recording"

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool IsAdminOrCis() =>
        User.IsInRole("Admin") || User.IsInRole("CIS");

    private async Task<bool> CanAccessProject(int projectId)
    {
        if (IsAdminOrCis()) return true;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return await _db.ProjectUserAccess
            .AnyAsync(a => a.ProjectId == projectId && a.UserId == userId);
    }

    private async Task<bool> CanManageTeam(int projectId)
    {
        if (IsAdminOrCis()) return true;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return await _db.ProjectUserAccess
            .AnyAsync(a => a.ProjectId == projectId && a.UserId == userId && a.Role == "SuperCustomer");
    }

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

    private async Task<PortalProjectDto> BuildPortalProjectDto(ImplementationProject project)
    {
        var assignment = await _db.ProjectJourneyAssignments
            .FirstOrDefaultAsync(a => a.ProjectId == project.Id);

        bool hasJourney = assignment != null;
        IEnumerable<StageProgressDto> stageProgress = [];

        if (assignment != null)
        {
            stageProgress = await ComputeStageProgress(project.Id, assignment.JourneyId);
        }

        return new PortalProjectDto(
            project.Id,
            project.CustomerName,
            project.Status,
            project.Program?.Name,
            project.Program?.Color,
            hasJourney,
            stageProgress);
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    // GET /api/portal/projects
    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects()
    {
        List<ImplementationProject> projects;

        if (IsAdminOrCis())
        {
            projects = await _db.Projects
                .Include(p => p.Program)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
        else
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            projects = await _db.ProjectUserAccess
                .Where(a => a.UserId == userId)
                .Select(a => a.Project)
                .Include(p => p.Program)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        var result = new List<PortalProjectDto>();
        foreach (var p in projects)
        {
            result.Add(await BuildPortalProjectDto(p));
        }

        return Ok(result);
    }

    // GET /api/portal/projects/{id}
    [HttpGet("projects/{id:int}")]
    public async Task<IActionResult> GetProject(int id)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var project = await _db.Projects
            .Include(p => p.Program)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project is null) return NotFound();

        return Ok(await BuildPortalProjectDto(project));
    }

    // GET /api/portal/projects/{id}/meetings
    [HttpGet("projects/{id:int}/meetings")]
    public async Task<IActionResult> GetMeetings(int id)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var meetings = await _db.ProjectMeetings
            .Where(m => m.ProjectId == id)
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.ScheduledAt)
            .ToListAsync();

        return Ok(meetings.Select(m => new PortalMeetingDto(
            m.Id, m.Title, m.MeetingType, m.Purpose, m.Description, m.Goals,
            m.ScheduledAt, m.DurationMinutes, m.Status, m.MeetingUrl, m.RecordingUrl, m.SortOrder)));
    }

    // GET /api/portal/projects/{id}/resources
    [HttpGet("projects/{id:int}/resources")]
    public async Task<IActionResult> GetResources(int id)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var resources = await _db.ProjectResources
            .Where(r => r.ProjectId == id
                && r.ResourceType != "CustomerSuccess"
                && r.ResourceType != "TechnicalSupport")
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        return Ok(resources.Select(r => new PortalResourceDto(r.Id, r.Title, r.ResourceType, r.ResourceUrl, r.SortOrder)));
    }

    // GET /api/portal/projects/{id}/post-golive-resources
    [HttpGet("projects/{id:int}/post-golive-resources")]
    public async Task<IActionResult> GetPostGoLiveResources(int id)
    {
        if (!await CanAccessProject(id)) return Forbid();

        // Load the journey assignment to get stage info
        var assignment = await _db.ProjectJourneyAssignments
            .FirstOrDefaultAsync(a => a.ProjectId == id);

        var seenIds = new HashSet<int>();
        var result = new List<PortalResourceDto>();

        if (assignment != null)
        {
            // Get all JourneyItem IDs that belong to PostGoLive stages
            var postGoLiveItemIds = await _db.JourneyStages
                .Where(s => s.JourneyId == assignment.JourneyId
                    && s.StageCategoryId != null
                    && s.StageCategory!.Name == "PostGoLive")
                .SelectMany(s => s.Items.Select(i => i.Id))
                .ToListAsync();

            if (postGoLiveItemIds.Count > 0)
            {
                var journeyResources = await _db.ProjectResources
                    .Where(r => r.ProjectId == id && r.JourneyItemId != null && postGoLiveItemIds.Contains(r.JourneyItemId.Value))
                    .OrderBy(r => r.SortOrder)
                    .ToListAsync();

                foreach (var r in journeyResources)
                {
                    if (seenIds.Add(r.Id))
                        result.Add(new PortalResourceDto(r.Id, r.Title, r.ResourceType, r.ResourceUrl, r.SortOrder));
                }
            }
        }

        // Also load CustomerSuccess / TechnicalSupport resources
        var supportResources = await _db.ProjectResources
            .Where(r => r.ProjectId == id
                && (r.ResourceType == "CustomerSuccess" || r.ResourceType == "TechnicalSupport"))
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        foreach (var r in supportResources)
        {
            if (seenIds.Add(r.Id))
                result.Add(new PortalResourceDto(r.Id, r.Title, r.ResourceType, r.ResourceUrl, r.SortOrder));
        }

        return Ok(result);
    }

    // GET /api/portal/projects/{id}/forms
    [HttpGet("projects/{id:int}/forms")]
    public async Task<IActionResult> GetForms(int id)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        bool isCustomerOnly = !IsAdminOrCis() && !User.IsInRole("SuperCustomer");

        var query = _db.ProjectFormAssignments
            .Where(f => f.ProjectId == id)
            .Include(f => f.Form)
            .OrderBy(f => f.SortOrder)
            .AsQueryable();

        if (isCustomerOnly)
        {
            query = query.Where(f => f.AssignedToUserId == null || f.AssignedToUserId == userId);
        }

        var assignments = await query.ToListAsync();

        var userIds = assignments
            .Where(a => a.AssignedToUserId != null)
            .Select(a => a.AssignedToUserId!)
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(assignments.Select(f => new PortalFormAssignmentDto(
            f.Id, f.FormId, f.Form.Name, f.Status,
            f.AssignedToUserId,
            f.AssignedToUserId != null && users.TryGetValue(f.AssignedToUserId, out var name) ? name : null,
            f.SortOrder, f.Notes)));
    }

    // GET /api/portal/projects/{id}/team
    [HttpGet("projects/{id:int}/team")]
    public async Task<IActionResult> GetTeam(int id)
    {
        if (!await CanManageTeam(id)) return Forbid();

        var team = await _db.ProjectUserAccess
            .Where(a => a.ProjectId == id)
            .Join(_db.Users,
                a => a.UserId,
                u => u.Id,
                (a, u) => new PortalTeamMemberDto(a.Id, a.UserId, u.FullName, u.Email ?? "", a.Role))
            .ToListAsync();

        return Ok(team);
    }

    // POST /api/portal/projects/{id}/team/invite
    [HttpPost("projects/{id:int}/team/invite")]
    public async Task<IActionResult> InviteToTeam(int id, [FromBody] InviteRequest req)
    {
        if (!await CanManageTeam(id)) return Forbid();

        if (req.Role != "SuperCustomer" && req.Role != "Customer")
            return BadRequest(new { message = "Role must be 'SuperCustomer' or 'Customer'." });

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == req.UserId);
        if (targetUser is null) return BadRequest(new { message = "User not found." });

        var exists = await _db.ProjectUserAccess
            .AnyAsync(a => a.ProjectId == id && a.UserId == req.UserId);
        if (exists) return Conflict(new { message = "User already has access to this project." });

        var grantedByUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

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

        await _audit.LogAsync(User, "team.invited", "ProjectUserAccess", access.Id.ToString(), targetUser.FullName,
            projectId: id, projectName: project.CustomerName,
            detail: $"{targetUser.FullName} invited as {req.Role}");

        return Ok(new PortalTeamMemberDto(access.Id, access.UserId, targetUser.FullName, targetUser.Email ?? "", access.Role));
    }

    // DELETE /api/portal/projects/{id}/team/{userId}
    [HttpDelete("projects/{id:int}/team/{userId}")]
    public async Task<IActionResult> RemoveFromTeam(int id, string userId)
    {
        if (!await CanManageTeam(id)) return Forbid();

        var access = await _db.ProjectUserAccess
            .FirstOrDefaultAsync(a => a.ProjectId == id && a.UserId == userId);

        if (access is null) return NotFound();

        var removedUserId = access.UserId;
        _db.ProjectUserAccess.Remove(access);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(User, "team.removed", "ProjectUserAccess", removedUserId, removedUserId,
            projectId: id, detail: $"User {removedUserId} removed from project team");

        return NoContent();
    }

    // PUT /api/portal/projects/{id}/forms/{faid}/assign
    [HttpPut("projects/{id:int}/forms/{faid:int}/assign")]
    public async Task<IActionResult> AssignForm(int id, int faid, [FromBody] AssignFormRequest req)
    {
        if (!await CanManageTeam(id)) return Forbid();

        var assignment = await _db.ProjectFormAssignments
            .Include(f => f.Form)
            .FirstOrDefaultAsync(f => f.Id == faid && f.ProjectId == id);

        if (assignment is null) return NotFound();

        assignment.AssignedToUserId = req.AssignedToUserId;
        assignment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        string? assignedToName = null;
        if (assignment.AssignedToUserId != null)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == assignment.AssignedToUserId);
            assignedToName = user?.FullName;
        }

        return Ok(new PortalFormAssignmentDto(
            assignment.Id, assignment.FormId, assignment.Form.Name, assignment.Status,
            assignment.AssignedToUserId, assignedToName,
            assignment.SortOrder, assignment.Notes));
    }

    // GET /api/portal/projects/{id}/forms/{faid}/detail
    [HttpGet("projects/{id:int}/forms/{faid:int}/detail")]
    public async Task<IActionResult> GetFormDetail(int id, int faid)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var assignment = await _db.ProjectFormAssignments
            .Include(f => f.Form)
                .ThenInclude(f => f.Fields.Where(ff => !ff.IsArchived))
            .FirstOrDefaultAsync(f => f.Id == faid && f.ProjectId == id);

        if (assignment is null) return NotFound();

        // For Customer role, check assignment
        if (!IsAdminOrCis() && !User.IsInRole("SuperCustomer"))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (assignment.AssignedToUserId != null && assignment.AssignedToUserId != userId)
                return Forbid();
        }

        var formDto = new FormWithFieldsDto(
            assignment.Form.Id,
            assignment.Form.Name,
            assignment.Form.Description,
            assignment.Form.Status,
            assignment.Form.AllowFileSubmission,
            assignment.Form.Fields
                .OrderBy(f => f.SortOrder)
                .Select(f => new FormFieldForFillDto(
                    f.Id, f.Label, f.FieldType, f.IsRequired, f.SortOrder,
                    f.DataSourceType, f.DataSourceId, f.MaxLength,
                    f.CrossFormPreFillFormId, f.CrossFormPreFillFieldId,
                    f.DataSourceFormId, f.DataSourceFieldId,
                    f.AllowCustomValue, f.AutoFillValue)));

        return Ok(formDto);
    }

    // GET /api/portal/projects/{id}/forms/{faid}/submission
    [HttpGet("projects/{id:int}/forms/{faid:int}/submission")]
    public async Task<IActionResult> GetSubmission(int id, int faid)
    {
        if (!await CanAccessProject(id)) return Forbid();

        // Verify faid belongs to this project before loading the submission
        var assignmentExists = await _db.ProjectFormAssignments
            .AnyAsync(f => f.Id == faid && f.ProjectId == id);
        if (!assignmentExists) return NotFound();

        var submission = await _db.FormSubmissions
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(s => s.ProjectFormAssignmentId == faid);

        if (submission is null) return NotFound();

        return Ok(new FormSubmissionDto(
            submission.Id, submission.ProjectFormAssignmentId,
            submission.Status, submission.SubmittedAt,
            submission.CreatedAt, submission.UpdatedAt,
            submission.Answers.Select(a => new FormSubmissionAnswerDto(a.Id, a.FormFieldId, a.Value))));
    }

    // POST /api/portal/projects/{id}/forms/{faid}/submission
    [HttpPost("projects/{id:int}/forms/{faid:int}/submission")]
    public async Task<IActionResult> SaveDraft(int id, int faid, [FromBody] SaveDraftRequest req)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var assignment = await _db.ProjectFormAssignments
            .Include(f => f.Form)
                .ThenInclude(f => f.Fields.Where(ff => !ff.IsArchived))
            .FirstOrDefaultAsync(f => f.Id == faid && f.ProjectId == id);
        if (assignment is null) return NotFound();
        if (assignment.Status == "Submitted")
            return BadRequest(new { message = "This form has already been submitted." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // Customer-only: verify this form is assigned to them (or unassigned)
        if (!IsAdminOrCis() && !User.IsInRole("SuperCustomer"))
        {
            if (assignment.AssignedToUserId != null && assignment.AssignedToUserId != userId)
                return Forbid();
        }

        // Validate all submitted FormFieldIds belong to this form
        var validFieldIds = assignment.Form.Fields.Select(f => f.Id).ToHashSet();
        if (req.Answers.Any(a => !validFieldIds.Contains(a.FormFieldId)))
            return BadRequest(new { message = "One or more form field IDs are invalid." });

        var existing = await _db.FormSubmissions
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(s => s.ProjectFormAssignmentId == faid);

        if (existing is null)
        {
            existing = new FormSubmission
            {
                ProjectFormAssignmentId = faid,
                SubmittedByUserId = userId,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.FormSubmissions.Add(existing);
            await _db.SaveChangesAsync();
        }

        // Replace answers: remove old, add new
        _db.FormSubmissionAnswers.RemoveRange(existing.Answers);

        // Build auto-fill lookup (field ID → fixed value)
        var autoFillMap = assignment.Form.Fields
            .Where(f => !string.IsNullOrEmpty(f.AutoFillValue))
            .ToDictionary(f => f.Id, f => f.AutoFillValue!);

        // Add user-submitted answers, skipping auto-fill fields
        foreach (var a in req.Answers)
        {
            if (autoFillMap.ContainsKey(a.FormFieldId)) continue;
            _db.FormSubmissionAnswers.Add(new FormSubmissionAnswer
            {
                FormSubmissionId = existing.Id,
                FormFieldId = a.FormFieldId,
                Value = a.Value,
            });
        }

        // Inject auto-fill answers regardless of what client submitted
        foreach (var (fieldId, value) in autoFillMap)
        {
            _db.FormSubmissionAnswers.Add(new FormSubmissionAnswer
            {
                FormSubmissionId = existing.Id,
                FormFieldId = fieldId,
                Value = value,
            });
        }

        existing.UpdatedAt = DateTime.UtcNow;
        if (assignment.Status == "NotStarted")
        {
            assignment.Status = "InProgress";
            assignment.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        // Reload answers
        var answers = await _db.FormSubmissionAnswers
            .Where(a => a.FormSubmissionId == existing.Id)
            .ToListAsync();

        return Ok(new FormSubmissionDto(
            existing.Id, existing.ProjectFormAssignmentId,
            existing.Status, existing.SubmittedAt,
            existing.CreatedAt, existing.UpdatedAt,
            answers.Select(a => new FormSubmissionAnswerDto(a.Id, a.FormFieldId, a.Value))));
    }

    // PUT /api/portal/projects/{id}/forms/{faid}/submission/submit
    [HttpPut("projects/{id:int}/forms/{faid:int}/submission/submit")]
    public async Task<IActionResult> SubmitForm(int id, int faid, [FromBody] SaveDraftRequest req)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var assignment = await _db.ProjectFormAssignments
            .Include(f => f.Form)
                .ThenInclude(f => f.Fields.Where(ff => !ff.IsArchived))
            .FirstOrDefaultAsync(f => f.Id == faid && f.ProjectId == id);
        if (assignment is null) return NotFound();
        if (assignment.Status == "Submitted")
            return BadRequest(new { message = "This form has already been submitted." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // Customer-only: verify this form is assigned to them (or unassigned)
        if (!IsAdminOrCis() && !User.IsInRole("SuperCustomer"))
        {
            if (assignment.AssignedToUserId != null && assignment.AssignedToUserId != userId)
                return Forbid();
        }

        // Validate all submitted FormFieldIds belong to this form
        var validFieldIds = assignment.Form.Fields.Select(f => f.Id).ToHashSet();
        if (req.Answers.Any(a => !validFieldIds.Contains(a.FormFieldId)))
            return BadRequest(new { message = "One or more form field IDs are invalid." });

        var existing = await _db.FormSubmissions
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(s => s.ProjectFormAssignmentId == faid);

        if (existing is null)
        {
            existing = new FormSubmission
            {
                ProjectFormAssignmentId = faid,
                SubmittedByUserId = userId,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.FormSubmissions.Add(existing);
            await _db.SaveChangesAsync();
        }

        // Replace answers
        _db.FormSubmissionAnswers.RemoveRange(existing.Answers);

        // Build auto-fill lookup (field ID → fixed value)
        var autoFillMapSubmit = assignment.Form.Fields
            .Where(f => !string.IsNullOrEmpty(f.AutoFillValue))
            .ToDictionary(f => f.Id, f => f.AutoFillValue!);

        // Add user-submitted answers, skipping auto-fill fields
        foreach (var a in req.Answers)
        {
            if (autoFillMapSubmit.ContainsKey(a.FormFieldId)) continue;
            _db.FormSubmissionAnswers.Add(new FormSubmissionAnswer
            {
                FormSubmissionId = existing.Id,
                FormFieldId = a.FormFieldId,
                Value = a.Value,
            });
        }

        // Inject auto-fill answers regardless of what client submitted
        foreach (var (fieldId, value) in autoFillMapSubmit)
        {
            _db.FormSubmissionAnswers.Add(new FormSubmissionAnswer
            {
                FormSubmissionId = existing.Id,
                FormFieldId = fieldId,
                Value = value,
            });
        }

        existing.Status = "Submitted";
        existing.SubmittedAt = DateTime.UtcNow;
        existing.SubmittedByUserId = userId;
        existing.UpdatedAt = DateTime.UtcNow;

        assignment.Status = "Submitted";
        assignment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        await _audit.LogAsync(User, "form.submitted", "FormSubmission", existing.Id.ToString(),
            assignment.Form?.Name,
            projectId: id, projectName: project?.CustomerName,
            detail: $"Form '{assignment.Form?.Name}' submitted");

        var answers = await _db.FormSubmissionAnswers
            .Where(a => a.FormSubmissionId == existing.Id)
            .ToListAsync();

        return Ok(new FormSubmissionDto(
            existing.Id, existing.ProjectFormAssignmentId,
            existing.Status, existing.SubmittedAt,
            existing.CreatedAt, existing.UpdatedAt,
            answers.Select(a => new FormSubmissionAnswerDto(a.Id, a.FormFieldId, a.Value))));
    }

    // GET /api/portal/projects/{id}/history — SC/Customer actions only
    [HttpGet("projects/{id:int}/history")]
    public async Task<IActionResult> GetProjectHistory(int id)
    {
        if (!await CanAccessProject(id)) return Forbid();

        var items = await _db.AuditLogEntries
            .Where(a => a.ProjectId == id
                && (a.UserRole == "SuperCustomer" || a.UserRole == "Customer"))
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new
            {
                a.Id, a.Timestamp, a.UserId, a.UserFullName, a.UserRole,
                a.Action, a.EntityType, a.EntityId, a.EntityName,
                a.ProjectId, a.ProjectName, a.Detail
            })
            .ToListAsync();

        return Ok(items);
    }

    // POST /api/portal/projects/{id}/resources/{rid}/view
    [HttpPost("projects/{id:int}/resources/{rid:int}/view")]
    public async Task<IActionResult> RecordResourceView(int id, int rid)
    {
        if (!await CanAccessProject(id)) return Forbid();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        _db.ResourceViewEvents.Add(new ResourceViewEvent
        {
            ResourceId = rid,
            ProjectId = id,
            UserId = userId,
            ViewedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    // POST /api/portal/projects/{id}/meetings/{mid}/click
    [HttpPost("projects/{id:int}/meetings/{mid:int}/click")]
    public async Task<IActionResult> RecordMeetingClick(int id, int mid)
    {
        if (!await CanAccessProject(id)) return Forbid();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        _db.MeetingLinkClickEvents.Add(new MeetingLinkClickEvent
        {
            MeetingId = mid,
            ProjectId = id,
            UserId = userId,
            ClickedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ── Cross-form data endpoints ──────────────────────────────────────────────

    // GET /api/portal/dropdown-options?dataSourceType=ReferenceData&dataSourceId=5
    [HttpGet("dropdown-options")]
    public async Task<IActionResult> GetDropdownOptions(
        [FromQuery] string dataSourceType,
        [FromQuery] int? dataSourceId)
    {
        IList<string> options = dataSourceType switch
        {
            "ReferenceData" when dataSourceId.HasValue =>
                await _db.ReferenceDataItems
                    .Where(i => i.DataSetId == dataSourceId.Value && i.IsActive && i.DataSet.IsActive)
                    .OrderBy(i => i.SortOrder).ThenBy(i => i.Label)
                    .Select(i => i.Label)
                    .ToListAsync(),

            "ProductType" =>
                await _db.ProductTypes
                    .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
                    .Select(p => p.Name)
                    .ToListAsync(),

            "Category" =>
                await _db.Categories
                    .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
                    .Select(c => c.Name)
                    .ToListAsync(),

            "UnitOfMeasure" =>
                await _db.UnitsOfMeasure
                    .Where(u => u.IsActive && (
                        !dataSourceId.HasValue ||
                        (dataSourceId == 1 && u.UnitCategory == "Volume") ||
                        (dataSourceId == 2 && u.UnitCategory == "Weight") ||
                        (dataSourceId == 3 && u.UnitCategory == "Count")))
                    .OrderBy(u => u.SortOrder).ThenBy(u => u.Name)
                    .Select(u => u.Name)
                    .ToListAsync(),

            "ItemCategory" =>
                await _db.ItemCategories
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
                    .Select(c => c.Name)
                    .ToListAsync(),

            "ItemCatalog" =>
                await _db.CatalogItems
                    .Where(c => c.IsActive)
                    .Select(c => c.ItemName)
                    .Distinct()
                    .OrderBy(n => n)
                    .ToListAsync(),

            _ => []
        };

        return Ok(options);
    }

    // GET /api/portal/projects/{id}/cross-form-data?sourceFormId=X&sourceFieldId=Y&mode=prefill|dropdown
    [HttpGet("projects/{id:int}/cross-form-data")]
    public async Task<IActionResult> GetCrossFormData(
        int id,
        [FromQuery] int sourceFormId,
        [FromQuery] int sourceFieldId,
        [FromQuery] string mode = "prefill")
    {
        if (!await CanAccessProject(id)) return Forbid();

        // IDOR: verify the source field belongs to the source form
        var fieldExists = await _db.FormFields
            .AnyAsync(f => f.Id == sourceFieldId && f.FormId == sourceFormId && !f.IsArchived);
        if (!fieldExists)
            return BadRequest(new { message = "Source field does not belong to source form." });

        if (mode == "prefill")
        {
            var value = await _db.FormSubmissionAnswers
                .Where(a =>
                    a.FormFieldId == sourceFieldId &&
                    a.FormSubmission.Status == "Submitted" &&
                    a.FormSubmission.ProjectFormAssignment.ProjectId == id &&
                    a.FormSubmission.ProjectFormAssignment.FormId == sourceFormId)
                .OrderByDescending(a => a.FormSubmission.SubmittedAt)
                .Select(a => a.Value)
                .FirstOrDefaultAsync();

            return Ok(new { value });
        }
        else if (mode == "dropdown")
        {
            var values = await _db.FormSubmissionAnswers
                .Where(a =>
                    a.FormFieldId == sourceFieldId &&
                    a.FormSubmission.Status == "Submitted" &&
                    a.FormSubmission.ProjectFormAssignment.ProjectId == id &&
                    a.FormSubmission.ProjectFormAssignment.FormId == sourceFormId &&
                    !string.IsNullOrEmpty(a.Value))
                .Select(a => a.Value)
                .Distinct()
                .OrderBy(v => v)
                .ToListAsync();

            return Ok(values);
        }

        return BadRequest(new { message = "Invalid mode. Use 'prefill' or 'dropdown'." });
    }

    // GET /api/portal/projects/{id}/submission-data  (Admin/CIS only)
    [HttpGet("projects/{id:int}/submission-data")]
    public async Task<IActionResult> GetProjectSubmissionData(int id)
    {
        if (!IsAdminOrCis()) return Forbid();
        if (!await CanAccessProject(id)) return Forbid();

        var submissions = await _db.FormSubmissions
            .Where(s =>
                s.Status == "Submitted" &&
                s.ProjectFormAssignment.ProjectId == id)
            .Include(s => s.ProjectFormAssignment)
                .ThenInclude(a => a.Form)
                    .ThenInclude(f => f.Fields.Where(ff => !ff.IsArchived))
            .Include(s => s.Answers)
            .Include(s => s.SubmittedBy)
            .OrderBy(s => s.ProjectFormAssignment.Form.Name)
            .ThenByDescending(s => s.SubmittedAt)
            .ToListAsync();

        var grouped = submissions
            .GroupBy(s => s.ProjectFormAssignment.Form)
            .Select(g => new ProjectSubmissionFormDto(
                g.Key.Id,
                g.Key.Name,
                g.Select(s => new ProjectSubmissionRowDto(
                    s.Id,
                    s.SubmittedBy?.FullName,
                    s.SubmittedAt,
                    s.Answers.Select(a =>
                    {
                        var field = g.Key.Fields.FirstOrDefault(f => f.Id == a.FormFieldId);
                        return new ProjectSubmissionAnswerDto(
                            a.Id, a.FormFieldId, field?.Label ?? "", a.Value);
                    })
                    .OrderBy(a => g.Key.Fields.FirstOrDefault(f => f.Id == a.FieldId)?.SortOrder ?? 0)
                ))));

        return Ok(grouped);
    }

    // PUT /api/portal/projects/{id}/submission-data/{answerId}  (Admin/CIS only)
    [HttpPut("projects/{id:int}/submission-data/{answerId:int}")]
    public async Task<IActionResult> UpdateSubmissionAnswer(int id, int answerId, [FromBody] UpdateAnswerRequest req)
    {
        if (!IsAdminOrCis()) return Forbid();

        // IDOR: verify the answer belongs to a submission on this project
        var answer = await _db.FormSubmissionAnswers
            .Include(a => a.FormSubmission)
                .ThenInclude(s => s.ProjectFormAssignment)
            .FirstOrDefaultAsync(a =>
                a.Id == answerId &&
                a.FormSubmission.ProjectFormAssignment.ProjectId == id);

        if (answer is null) return NotFound();

        answer.Value = req.Value;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(User, "submission.answer.edited", "FormSubmissionAnswer",
            answerId.ToString(), null, projectId: id, detail: $"Answer {answerId} updated to '{req.Value}'");

        return Ok(new { id = answer.Id, value = answer.Value });
    }
}
