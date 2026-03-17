using System.Security.Claims;
using ImpWizard.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;

namespace ImpWizard.Api.Services;

public interface IAuditService
{
    Task LogAsync(
        ClaimsPrincipal actor,
        string action,
        string entityType,
        string? entityId = null,
        string? entityName = null,
        int? projectId = null,
        string? projectName = null,
        string? detail = null);
}

public class AuditService : IAuditService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public AuditService(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

    public async Task LogAsync(
        ClaimsPrincipal actor,
        string action,
        string entityType,
        string? entityId = null,
        string? entityName = null,
        int? projectId = null,
        string? projectName = null,
        string? detail = null)
    {
        try
        {
            var userId = actor.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var fullName = actor.FindFirstValue("fullName") ?? "";
            var role = actor.FindFirstValue(ClaimTypes.Role) ?? "";

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            db.AuditLogEntries.Add(new AuditLogEntry
            {
                Timestamp = DateTime.UtcNow,
                UserId = userId,
                UserFullName = fullName,
                UserRole = role,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                EntityName = entityName,
                ProjectId = projectId,
                ProjectName = projectName,
                Detail = detail,
            });

            await db.SaveChangesAsync();
        }
        catch
        {
            // Audit failures must never disrupt the main operation
        }
    }
}
