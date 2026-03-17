using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/programs")]
[Authorize(Roles = "Admin")]
public class ProgramsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IAuditService _audit;

    public ProgramsController(AppDbContext db, UserManager<ApplicationUser> userManager, IAuditService audit)
    {
        _db = db;
        _userManager = userManager;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ProgramDto(
        int Id,
        string Name,
        string? Description,
        string? Color,
        bool IsActive,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ProgramDetailDto(
        int Id,
        string Name,
        string? Description,
        string? Color,
        bool IsActive,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        int ImplementationTypeCount,
        int FormCount,
        int ImportTemplateCount,
        int ProjectCount,
        IEnumerable<ProgramUserDto> RestrictedUsers
    );

    public record ProgramUserDto(string UserId, string FullName, string Email);

    public record CreateProgramRequest(string Name, string? Description, string? Color);

    public record UpdateProgramRequest(string? Name, string? Description, string? Color, bool? IsActive);

    public record AssignUserRequest(string UserId);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ProgramDto ToDto(ImpWizard.Infrastructure.Data.Program p) =>
        new(p.Id, p.Name, p.Description, p.Color, p.IsActive, p.CreatedAt, p.UpdatedAt);

    // ── Endpoints ─────────────────────────────────────────────────────────────

    [HttpGet]
    [Authorize(Roles = "Admin,CIS")]
    public async Task<IActionResult> GetAll()
    {
        var programs = await _db.Programs
            .OrderBy(p => p.Name)
            .ToListAsync();
        return Ok(programs.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var program = await _db.Programs
            .FirstOrDefaultAsync(p => p.Id == id);

        if (program is null) return NotFound();

        var implTypeCount = await _db.ImplementationTypes.CountAsync(t => t.ProgramId == id);
        var formCount = await _db.Forms.CountAsync(f => f.ProgramId == id);
        var templateCount = await _db.ImportTemplates.CountAsync(t => t.ProgramId == id);
        var projectCount = await _db.Projects.CountAsync(p => p.ProgramId == id);

        var accessRows = await _db.UserProgramAccess
            .Where(upa => upa.ProgramId == id)
            .Include(upa => upa.User)
            .ToListAsync();

        var restrictedUsers = accessRows.Select(upa => new ProgramUserDto(
            upa.UserId,
            upa.User.FullName ?? upa.User.UserName ?? upa.UserId,
            upa.User.Email ?? string.Empty
        ));

        return Ok(new ProgramDetailDto(
            program.Id, program.Name, program.Description, program.Color,
            program.IsActive, program.CreatedAt, program.UpdatedAt,
            implTypeCount, formCount, templateCount, projectCount,
            restrictedUsers
        ));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProgramRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var program = new ImpWizard.Infrastructure.Data.Program
        {
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            Color = req.Color?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Programs.Add(program);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "program.created", "Program", program.Id.ToString(), program.Name);
        return CreatedAtAction(nameof(GetById), new { id = program.Id }, ToDto(program));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProgramRequest req)
    {
        var program = await _db.Programs.FirstOrDefaultAsync(p => p.Id == id);
        if (program is null) return NotFound();

        if (req.Name is not null) program.Name = req.Name.Trim();
        if (req.Description is not null) program.Description = req.Description.Trim();
        if (req.Color is not null) program.Color = req.Color.Trim();
        if (req.IsActive is not null) program.IsActive = req.IsActive.Value;
        program.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "program.updated", "Program", program.Id.ToString(), program.Name);
        return Ok(ToDto(program));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var program = await _db.Programs.FirstOrDefaultAsync(p => p.Id == id);
        if (program is null) return NotFound();

        var name = program.Name;
        _db.Programs.Remove(program);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "program.deleted", "Program", id.ToString(), name);
        return NoContent();
    }

    // ── User Access (CIS restrictions) ────────────────────────────────────────

    /// <summary>
    /// Assign a CIS user to this program (restricts them to this program's journeys/projects).
    /// If a CIS user has ANY program access rows, they are limited to only those programs.
    /// </summary>
    [HttpPost("{id:int}/users")]
    public async Task<IActionResult> AssignUser(int id, [FromBody] AssignUserRequest req)
    {
        var program = await _db.Programs.FirstOrDefaultAsync(p => p.Id == id);
        if (program is null) return NotFound(new { message = "Program not found." });

        var user = await _userManager.FindByIdAsync(req.UserId);
        if (user is null) return NotFound(new { message = "User not found." });

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains("CIS"))
            return BadRequest(new { message = "Only CIS users can be restricted to programs." });

        var existing = await _db.UserProgramAccess
            .FirstOrDefaultAsync(upa => upa.UserId == req.UserId && upa.ProgramId == id);

        if (existing is not null)
            return Conflict(new { message = "User already has access to this program." });

        _db.UserProgramAccess.Add(new UserProgramAccess
        {
            UserId = req.UserId,
            ProgramId = id,
            GrantedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "User restricted to program." });
    }

    /// <summary>
    /// Remove a CIS user's program restriction. If this was their last program row,
    /// they revert to unrestricted access.
    /// </summary>
    [HttpDelete("{id:int}/users/{userId}")]
    public async Task<IActionResult> RemoveUser(int id, string userId)
    {
        var access = await _db.UserProgramAccess
            .FirstOrDefaultAsync(upa => upa.ProgramId == id && upa.UserId == userId);

        if (access is null) return NotFound();

        _db.UserProgramAccess.Remove(access);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Get all CIS users and their program access status (for the assign-user dialog).
    /// Returns all CIS users with a flag indicating if they're already assigned to this program.
    /// </summary>
    [HttpGet("{id:int}/eligible-users")]
    public async Task<IActionResult> GetEligibleUsers(int id)
    {
        var cisUsers = await _userManager.GetUsersInRoleAsync("CIS");

        var assignedIds = await _db.UserProgramAccess
            .Where(upa => upa.ProgramId == id)
            .Select(upa => upa.UserId)
            .ToListAsync();

        var result = cisUsers.Select(u => new
        {
            UserId = u.Id,
            FullName = u.FullName ?? u.UserName ?? u.Id,
            Email = u.Email ?? string.Empty,
            IsAssigned = assignedIds.Contains(u.Id),
        });

        return Ok(result);
    }
}
