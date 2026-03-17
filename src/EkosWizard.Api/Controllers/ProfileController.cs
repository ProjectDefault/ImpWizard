using System.Security.Claims;
using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly IAuditService _audit;

    public ProfileController(UserManager<ApplicationUser> users, IAuditService audit)
    {
        _users = users;
        _audit = audit;
    }

    public record ProfileDto(
        string Id,
        string Email,
        string FullName,
        string? Title,
        string? Organization,
        string? TimeZoneId,
        string Role);

    public record UpdateProfilePayload(
        string? FullName,
        string? Title,
        string? Organization,
        string? TimeZoneId);

    public record UpdateEmailPayload(string NewEmail, string CurrentPassword);
    public record UpdatePasswordPayload(string CurrentPassword, string NewPassword);

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _users.FindByIdAsync(userId ?? "");
        if (user is null) return NotFound();

        var roles = await _users.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Customer";

        return Ok(new ProfileDto(user.Id, user.Email ?? "", user.FullName, user.Title, user.Organization, user.TimeZoneId, role));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfilePayload payload)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _users.FindByIdAsync(userId ?? "");
        if (user is null) return NotFound();

        if (payload.FullName is not null) user.FullName = payload.FullName.Trim();
        if (payload.Title is not null) user.Title = string.IsNullOrWhiteSpace(payload.Title) ? null : payload.Title.Trim();
        if (payload.Organization is not null) user.Organization = string.IsNullOrWhiteSpace(payload.Organization) ? null : payload.Organization.Trim();
        if (payload.TimeZoneId is not null) user.TimeZoneId = string.IsNullOrWhiteSpace(payload.TimeZoneId) ? null : payload.TimeZoneId.Trim();

        var result = await _users.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await _audit.LogAsync(User, "profile.updated", "User", user.Id, user.FullName);
        return NoContent();
    }

    [HttpPut("email")]
    public async Task<IActionResult> UpdateEmail([FromBody] UpdateEmailPayload payload)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _users.FindByIdAsync(userId ?? "");
        if (user is null) return NotFound();

        if (!await _users.CheckPasswordAsync(user, payload.CurrentPassword))
            return BadRequest(new[] { "Current password is incorrect." });

        var token = await _users.GenerateChangeEmailTokenAsync(user, payload.NewEmail);
        var result = await _users.ChangeEmailAsync(user, payload.NewEmail, token);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        // Email == UserName in this app
        user.UserName = payload.NewEmail;
        user.NormalizedUserName = payload.NewEmail.ToUpperInvariant();
        await _users.UpdateAsync(user);

        await _audit.LogAsync(User, "profile.email_changed", "User", user.Id, user.FullName,
            detail: $"Email changed to {payload.NewEmail}");

        return Ok(new { message = "Email updated. Please log in again." });
    }

    [HttpPut("password")]
    public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordPayload payload)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _users.FindByIdAsync(userId ?? "");
        if (user is null) return NotFound();

        var result = await _users.ChangePasswordAsync(user, payload.CurrentPassword, payload.NewPassword);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await _audit.LogAsync(User, "profile.password_changed", "User", user.Id, user.FullName);
        return NoContent();
    }
}
