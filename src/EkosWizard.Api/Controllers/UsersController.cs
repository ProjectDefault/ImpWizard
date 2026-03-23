using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin,CIS")]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public UsersController(UserManager<ApplicationUser> users, RoleManager<IdentityRole> roles, AppDbContext db, IAuditService audit)
    {
        _users = users;
        _roles = roles;
        _db = db;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record UserListDto(string Id, string FullName, string Email, string UserName, string Role, string? Company, DateTime? LastLogin);

    public record UserDetailDto(string Id, string FullName, string Email, string UserName, string? Title, string? Organization, string? TimeZoneId, string Role);

    public record InviteRequest(string Email, string FullName, string Role);

    public record InviteResponse(string Id, string Email, string FullName, string Role, string TemporaryPassword);

    public record UpdateUserRequest(string FullName, string? Title, string? Organization, string? TimeZoneId, string? Role);

    public record ResetPasswordResponse(string TemporaryPassword);

    public record UserProjectDto(int Id, string CustomerName, string Status, string UserRole);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool IsAdmin() => User.IsInRole("Admin");

    // Roles that CIS are allowed to invite
    private static readonly string[] CisAllowedRoles = ["Customer", "SuperCustomer"];
    private static readonly string[] AllRoles = ["Admin", "CIS", "SuperCustomer", "Customer"];

    private static string GenerateTempPassword()
    {
        const string alpha = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        const string special = "!@#";
        var rng = Random.Shared;
        // Guarantee at least one special character, then shuffle
        var chars = Enumerable.Range(0, 11).Select(_ => alpha[rng.Next(alpha.Length)])
            .Append(special[rng.Next(special.Length)])
            .OrderBy(_ => rng.Next())
            .ToArray();
        return new string(chars);
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    /// <summary>List all users, optionally filtered by role.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? role = null)
    {
        var result = new List<UserListDto>();

        IQueryable<ApplicationUser> query = _users.Users;
        if (!string.IsNullOrWhiteSpace(role))
        {
            var usersInRole = await _users.GetUsersInRoleAsync(role);
            var ids = usersInRole.Select(u => u.Id).ToHashSet();
            query = query.Where(u => ids.Contains(u.Id));
        }

        var userList = await query.OrderBy(u => u.FullName).ToListAsync();

        foreach (var u in userList)
        {
            var roles = await _users.GetRolesAsync(u);
            var userRole = roles.FirstOrDefault() ?? "Customer";

            // Skip if filtered role doesn't match (double-check)
            if (!string.IsNullOrWhiteSpace(role) && userRole != role) continue;

            result.Add(new UserListDto(u.Id, u.FullName, u.Email ?? "", u.UserName ?? "", userRole, null, null));
        }

        return Ok(result);
    }

    /// <summary>Invite a new user (create account + assign role).</summary>
    [HttpPost("invite")]
    public async Task<IActionResult> Invite([FromBody] InviteRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.FullName))
            return BadRequest(new { message = "Email and full name are required." });

        // CIS can only invite Customer or SuperCustomer
        if (!IsAdmin() && !CisAllowedRoles.Contains(req.Role))
            return Forbid();

        if (!AllRoles.Contains(req.Role))
            return BadRequest(new { message = $"Invalid role '{req.Role}'." });

        // Check if user already exists
        if (await _users.FindByEmailAsync(req.Email) is not null)
            return Conflict(new { message = "A user with that email already exists." });

        var tempPassword = GenerateTempPassword();
        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            FullName = req.FullName.Trim(),
            EmailConfirmed = true,
        };

        var createResult = await _users.CreateAsync(user, tempPassword);
        if (!createResult.Succeeded)
            return BadRequest(new { message = string.Join("; ", createResult.Errors.Select(e => e.Description)) });

        await _users.AddToRoleAsync(user, req.Role);
        await _audit.LogAsync(User, "user.created", "User", user.Id, user.FullName);

        return Ok(new InviteResponse(user.Id, user.Email!, user.FullName, req.Role, tempPassword));
    }

    /// <summary>Get full detail for a single user.</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();

        var roles = await _users.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Customer";

        return Ok(new UserDetailDto(user.Id, user.FullName, user.Email ?? "", user.UserName ?? "",
            user.Title, user.Organization, user.TimeZoneId, role));
    }

    /// <summary>Update a user's profile fields and optionally their role (Admin only for role changes).</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest req)
    {
        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();

        if (string.IsNullOrWhiteSpace(req.FullName))
            return BadRequest(new { message = "Full name is required." });

        user.FullName = req.FullName.Trim();
        user.Title = req.Title?.Trim();
        user.Organization = req.Organization?.Trim();
        user.TimeZoneId = req.TimeZoneId?.Trim();

        var updateResult = await _users.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(new { message = string.Join("; ", updateResult.Errors.Select(e => e.Description)) });

        // Role change — Admin only
        if (!string.IsNullOrWhiteSpace(req.Role) && IsAdmin())
        {
            if (!AllRoles.Contains(req.Role))
                return BadRequest(new { message = $"Invalid role '{req.Role}'." });

            var currentRoles = await _users.GetRolesAsync(user);
            if (!currentRoles.Contains(req.Role))
            {
                await _users.RemoveFromRolesAsync(user, currentRoles);
                await _users.AddToRoleAsync(user, req.Role);
            }
        }

        await _audit.LogAsync(User, "user.updated", "User", user.Id, user.FullName);
        return Ok();
    }

    /// <summary>Reset a user's password to a new temporary one.</summary>
    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id)
    {
        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();

        var tempPassword = GenerateTempPassword();
        var token = await _users.GeneratePasswordResetTokenAsync(user);
        var result = await _users.ResetPasswordAsync(user, token, tempPassword);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        await _audit.LogAsync(User, "user.password_reset", "User", user.Id, user.FullName);
        return Ok(new ResetPasswordResponse(tempPassword));
    }

    /// <summary>Get projects associated with a user (as specialist or customer).</summary>
    [HttpGet("{id}/projects")]
    public async Task<IActionResult> GetUserProjects(string id)
    {
        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();

        var result = new List<UserProjectDto>();

        // Projects where user is the assigned specialist
        var specialistProjects = await _db.Projects
            .Where(p => p.AssignedSpecialistId == id)
            .ToListAsync();
        foreach (var p in specialistProjects)
            result.Add(new UserProjectDto(p.Id, p.CustomerName, p.Status, "Specialist"));

        // Projects where user has customer access
        var accessProjects = await _db.ProjectUserAccess
            .Where(a => a.UserId == id)
            .Include(a => a.Project)
            .ToListAsync();
        foreach (var a in accessProjects)
            if (a.Project is not null && result.All(r => r.Id != a.Project.Id))
                result.Add(new UserProjectDto(a.Project.Id, a.Project.CustomerName, a.Project.Status, a.Role));

        return Ok(result.OrderBy(p => p.CustomerName));
    }
}
