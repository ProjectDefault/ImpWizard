using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/journeys")]
[Authorize(Roles = "Admin,CIS")]
public class JourneysController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public JourneysController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record JourneyItemDto(int Id, string ItemType, int SortOrder, string Title, string? Description,
        string? MeetingType, string? MeetingPurpose, string? MeetingGoals, int? DefaultDurationMinutes,
        string? ResourceType, string? ResourceUrl, string? ResourceLabel,
        int? FormId, string? FormName);

    public record JourneyStageDto(int Id, string Name, string? Description, int SortOrder,
        int? StageCategoryId, string? StageCategoryName, string? Color, string? Icon, IEnumerable<JourneyItemDto> Items);

    public record JourneyListDto(int Id, string Name, string? Description, bool IsActive,
        int? ProgramId, string? ProgramName, int StageCount, DateTime CreatedAt, DateTime UpdatedAt);

    public record JourneyDetailDto(int Id, string Name, string? Description, bool IsActive,
        int? ProgramId, string? ProgramName, string? Tags, IEnumerable<JourneyStageDto> Stages);

    public record CreateJourneyRequest(string Name, string? Description, int? ProgramId, bool IsActive = true, string? Tags = null);
    public record UpdateJourneyRequest(string? Name, string? Description, int? ProgramId, bool? IsActive, string? Tags);

    public record CreateStageRequest(string Name, string? Description, int SortOrder = 0,
        int? StageCategoryId = null, string? Color = null, string? Icon = null);
    public record UpdateStageRequest(string? Name, string? Description, int? SortOrder,
        int? StageCategoryId, string? Color, string? Icon);

    public record ReorderRequest(int[] OrderedIds);

    public record CreateItemRequest(string ItemType, string Title, string? Description, int SortOrder = 0,
        string? MeetingType = null, string? MeetingPurpose = null, string? MeetingGoals = null, int? DefaultDurationMinutes = null,
        string? ResourceType = null, string? ResourceUrl = null, string? ResourceLabel = null,
        int? FormId = null);
    public record UpdateItemRequest(string? Title, string? Description, int? SortOrder,
        string? MeetingType, string? MeetingPurpose, string? MeetingGoals, int? DefaultDurationMinutes,
        string? ResourceType, string? ResourceUrl, string? ResourceLabel, int? FormId);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static JourneyItemDto ToItemDto(JourneyItem i) => new(
        i.Id, i.ItemType, i.SortOrder, i.Title, i.Description,
        i.MeetingType, i.MeetingPurpose, i.MeetingGoals, i.DefaultDurationMinutes,
        i.ResourceType, i.ResourceUrl, i.ResourceLabel,
        i.FormId, i.Form?.Name);

    private static JourneyStageDto ToStageDto(JourneyStage s) => new(
        s.Id, s.Name, s.Description, s.SortOrder,
        s.StageCategoryId, s.StageCategory?.Name,
        s.Color, s.Icon,
        s.Items.OrderBy(i => i.SortOrder).Select(ToItemDto));

    private static JourneyDetailDto ToDetail(Journey j) => new(
        j.Id, j.Name, j.Description, j.IsActive,
        j.ProgramId, j.Program?.Name, j.Tags,
        j.Stages.OrderBy(s => s.SortOrder).Select(ToStageDto));

    private async Task<Journey?> LoadFullJourneyAsync(int id) =>
        await _db.Journeys
            .Include(j => j.Program)
            .Include(j => j.Stages)
                .ThenInclude(s => s.StageCategory)
            .Include(j => j.Stages)
                .ThenInclude(s => s.Items)
                    .ThenInclude(i => i.Form)
            .FirstOrDefaultAsync(j => j.Id == id);

    // ── Journey Endpoints ─────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        IQueryable<Journey> query = _db.Journeys
            .Include(j => j.Program)
            .Include(j => j.Stages);

        // CIS: restrict to programs they are assigned to (if any restrictions exist)
        if (User.IsInRole("CIS") && !User.IsInRole("Admin"))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var allowedProgramIds = await _db.UserProgramAccess
                .Where(upa => upa.UserId == userId)
                .Select(upa => upa.ProgramId)
                .ToListAsync();

            if (allowedProgramIds.Count > 0)
                query = query.Where(j => j.ProgramId == null || allowedProgramIds.Contains(j.ProgramId!.Value));
        }

        var journeys = await query.OrderBy(j => j.Name).ToListAsync();
        return Ok(journeys.Select(j => new JourneyListDto(
            j.Id, j.Name, j.Description, j.IsActive,
            j.ProgramId, j.Program?.Name, j.Stages.Count,
            j.CreatedAt, j.UpdatedAt)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var journey = await LoadFullJourneyAsync(id);
        return journey is null ? NotFound() : Ok(ToDetail(journey));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateJourneyRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var journey = new Journey
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            ProgramId = req.ProgramId,
            IsActive = req.IsActive,
            Tags = req.Tags?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Journeys.Add(journey);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.created", "Journey", journey.Id.ToString(), journey.Name);

        var full = await LoadFullJourneyAsync(journey.Id);
        return CreatedAtAction(nameof(GetById), new { id = journey.Id }, ToDetail(full!));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateJourneyRequest req)
    {
        var journey = await LoadFullJourneyAsync(id);
        if (journey is null) return NotFound();

        if (req.Name is not null) journey.Name = req.Name.Trim();
        if (req.Description is not null) journey.Description = req.Description.Trim();
        if (req.ProgramId is not null) journey.ProgramId = req.ProgramId == 0 ? null : req.ProgramId;
        if (req.IsActive is not null) journey.IsActive = req.IsActive.Value;
        if (req.Tags is not null) journey.Tags = req.Tags.Trim();

        journey.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.updated", "Journey", journey.Id.ToString(), journey.Name);

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var journey = await _db.Journeys.FirstOrDefaultAsync(j => j.Id == id);
        if (journey is null) return NotFound();

        var name = journey.Name;
        // Soft-delete (no ProjectJourneyAssignment entity yet)
        journey.IsActive = false;
        journey.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.deleted", "Journey", id.ToString(), name);

        return NoContent();
    }

    // ── Stage Endpoints ───────────────────────────────────────────────────────

    [HttpPost("{id:int}/stages")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddStage(int id, [FromBody] CreateStageRequest req)
    {
        var journey = await _db.Journeys.FirstOrDefaultAsync(j => j.Id == id);
        if (journey is null) return NotFound(new { message = "Journey not found." });

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Stage name is required." });

        var stage = new JourneyStage
        {
            JourneyId = id,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            StageCategoryId = req.StageCategoryId,
            Color = req.Color,
            Icon = req.Icon,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.JourneyStages.Add(stage);
        journey.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.stage_added", "JourneyStage", stage.Id.ToString(), stage.Name);

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    [HttpPut("{id:int}/stages/{stageId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStage(int id, int stageId, [FromBody] UpdateStageRequest req)
    {
        var stage = await _db.JourneyStages.FirstOrDefaultAsync(s => s.Id == stageId && s.JourneyId == id);
        if (stage is null) return NotFound();

        if (req.Name is not null) stage.Name = req.Name.Trim();
        if (req.Description is not null) stage.Description = req.Description.Trim();
        if (req.SortOrder is not null) stage.SortOrder = req.SortOrder.Value;
        if (req.StageCategoryId is not null) stage.StageCategoryId = req.StageCategoryId == 0 ? null : req.StageCategoryId;
        if (req.Color is not null) stage.Color = req.Color;
        if (req.Icon is not null) stage.Icon = req.Icon;
        stage.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.stage_updated", "JourneyStage", stage.Id.ToString(), stage.Name);

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    [HttpDelete("{id:int}/stages/{stageId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStage(int id, int stageId)
    {
        var stage = await _db.JourneyStages.FirstOrDefaultAsync(s => s.Id == stageId && s.JourneyId == id);
        if (stage is null) return NotFound();

        var name = stage.Name;
        _db.JourneyStages.Remove(stage);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.stage_deleted", "JourneyStage", stageId.ToString(), name);

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    [HttpPut("{id:int}/stages/reorder")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ReorderStages(int id, [FromBody] ReorderRequest req)
    {
        var stages = await _db.JourneyStages.Where(s => s.JourneyId == id).ToListAsync();

        for (int i = 0; i < req.OrderedIds.Length; i++)
        {
            var stage = stages.FirstOrDefault(s => s.Id == req.OrderedIds[i]);
            if (stage is not null)
            {
                stage.SortOrder = i;
                stage.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    // ── Item Endpoints ────────────────────────────────────────────────────────

    [HttpPost("{id:int}/stages/{stageId:int}/items")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddItem(int id, int stageId, [FromBody] CreateItemRequest req)
    {
        var stage = await _db.JourneyStages.FirstOrDefaultAsync(s => s.Id == stageId && s.JourneyId == id);
        if (stage is null) return NotFound(new { message = "Stage not found." });

        if (!new[] { "Meeting", "Resource", "FormAssignment", "ProductList" }.Contains(req.ItemType))
            return BadRequest(new { message = "ItemType must be Meeting, Resource, FormAssignment, or ProductList." });

        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { message = "Title is required." });

        var item = new JourneyItem
        {
            JourneyStageId = stageId,
            ItemType = req.ItemType,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder,
            MeetingType = req.MeetingType,
            MeetingPurpose = req.MeetingPurpose,
            MeetingGoals = req.MeetingGoals,
            DefaultDurationMinutes = req.DefaultDurationMinutes,
            ResourceType = req.ResourceType,
            ResourceUrl = req.ResourceUrl,
            ResourceLabel = req.ResourceLabel,
            FormId = req.FormId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.JourneyItems.Add(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.item_added", "JourneyItem", item.Id.ToString(), item.Title);

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    [HttpPut("{id:int}/stages/{stageId:int}/items/{itemId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateItem(int id, int stageId, int itemId, [FromBody] UpdateItemRequest req)
    {
        var stage = await _db.JourneyStages.FirstOrDefaultAsync(s => s.Id == stageId && s.JourneyId == id);
        if (stage is null) return NotFound();

        var item = await _db.JourneyItems.FirstOrDefaultAsync(i => i.Id == itemId && i.JourneyStageId == stageId);
        if (item is null) return NotFound();

        if (req.Title is not null) item.Title = req.Title.Trim();
        if (req.Description is not null) item.Description = req.Description.Trim();
        if (req.SortOrder is not null) item.SortOrder = req.SortOrder.Value;
        if (req.MeetingType is not null) item.MeetingType = req.MeetingType;
        if (req.MeetingPurpose is not null) item.MeetingPurpose = req.MeetingPurpose;
        if (req.MeetingGoals is not null) item.MeetingGoals = req.MeetingGoals;
        if (req.DefaultDurationMinutes is not null) item.DefaultDurationMinutes = req.DefaultDurationMinutes;
        if (req.ResourceType is not null) item.ResourceType = req.ResourceType;
        if (req.ResourceUrl is not null) item.ResourceUrl = req.ResourceUrl;
        if (req.ResourceLabel is not null) item.ResourceLabel = req.ResourceLabel;
        if (req.FormId is not null) item.FormId = req.FormId == 0 ? null : req.FormId;
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.item_updated", "JourneyItem", item.Id.ToString(), item.Title);

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    [HttpDelete("{id:int}/stages/{stageId:int}/items/{itemId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteItem(int id, int stageId, int itemId)
    {
        var stage = await _db.JourneyStages.FirstOrDefaultAsync(s => s.Id == stageId && s.JourneyId == id);
        if (stage is null) return NotFound();

        var item = await _db.JourneyItems.FirstOrDefaultAsync(i => i.Id == itemId && i.JourneyStageId == stageId);
        if (item is null) return NotFound();

        var title = item.Title;
        _db.JourneyItems.Remove(item);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "journey.item_deleted", "JourneyItem", itemId.ToString(), title);

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }

    [HttpPut("{id:int}/stages/{stageId:int}/items/reorder")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ReorderItems(int id, int stageId, [FromBody] ReorderRequest req)
    {
        var stage = await _db.JourneyStages.FirstOrDefaultAsync(s => s.Id == stageId && s.JourneyId == id);
        if (stage is null) return NotFound();

        var items = await _db.JourneyItems.Where(i => i.JourneyStageId == stageId).ToListAsync();

        for (int i = 0; i < req.OrderedIds.Length; i++)
        {
            var item = items.FirstOrDefault(x => x.Id == req.OrderedIds[i]);
            if (item is not null)
            {
                item.SortOrder = i;
                item.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        var full = await LoadFullJourneyAsync(id);
        return Ok(ToDetail(full!));
    }
}
