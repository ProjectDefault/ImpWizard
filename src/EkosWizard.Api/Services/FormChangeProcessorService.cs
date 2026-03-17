using ImpWizard.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ImpWizard.Api.Services;

public class FormChangeProcessorService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FormChangeProcessorService> _logger;

    // Eastern Standard Time (UTC-5). Windows: "Eastern Standard Time", Linux: "America/New_York"
    private static readonly TimeZoneInfo Eastern = GetEasternTimeZone();

    public FormChangeProcessorService(
        IServiceScopeFactory scopeFactory,
        ILogger<FormChangeProcessorService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeUntilNextRun();
            _logger.LogInformation("FormChangeProcessor: next run in {Minutes:F0} minutes.", delay.TotalMinutes);

            await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                await ProcessQueueAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "FormChangeProcessor: error during processing.");
            }
        }
    }

    private async Task ProcessQueueAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var pending = await db.FormChangeQueues
            .Where(q => !q.IsProcessed)
            .ToListAsync(ct);

        if (pending.Count == 0)
        {
            _logger.LogInformation("FormChangeProcessor: no pending items.");
            return;
        }

        var activeProjects = await db.Projects
            .Where(p => p.Status == "Active")
            .ToListAsync(ct);

        foreach (var entry in pending)
        {
            var issues = DetectIssues(entry);

            foreach (var project in activeProjects)
            {
                var impact = new FormProjectImpact
                {
                    FormChangeQueueId = entry.Id,
                    ProjectId = project.Id,
                    ValidationIssuesJson = issues.Count > 0
                        ? JsonSerializer.Serialize(issues)
                        : null,
                    IsReviewed = false,
                };
                db.FormProjectImpacts.Add(impact);
            }

            entry.IsProcessed = true;
            entry.ProcessedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        _logger.LogInformation("FormChangeProcessor: processed {Count} queue entries.", pending.Count);
    }

    private static List<string> DetectIssues(FormChangeQueue entry)
    {
        var issues = new List<string>();

        if (entry.FieldSnapshotJson is null) return issues;

        try
        {
            using var doc = JsonDocument.Parse(entry.FieldSnapshotJson);
            var root = doc.RootElement;

            if (!root.TryGetProperty("before", out var before) ||
                !root.TryGetProperty("after", out var after))
                return issues;

            var beforeFields = ParseFieldSnapshots(before);
            var afterFields = ParseFieldSnapshots(after);

            foreach (var b in beforeFields)
            {
                if (!afterFields.TryGetValue(b.Key, out var a))
                {
                    issues.Add($"Field '{b.Value.Label}' was removed.");
                    continue;
                }

                if (b.Value.IsRequired && !a.IsRequired)
                    issues.Add($"Field '{b.Value.Label}' changed from required to optional.");

                if (b.Value.FieldType != a.FieldType)
                    issues.Add($"Field '{b.Value.Label}' type changed from {b.Value.FieldType} to {a.FieldType}.");

                if (b.Value.MaxLength.HasValue && a.MaxLength.HasValue && a.MaxLength < b.Value.MaxLength)
                    issues.Add($"Field '{b.Value.Label}' max length reduced from {b.Value.MaxLength} to {a.MaxLength}.");
            }

            foreach (var a in afterFields)
            {
                if (!beforeFields.ContainsKey(a.Key))
                    issues.Add($"Field '{a.Value.Label}' was added.");
            }
        }
        catch { /* ignore malformed snapshots */ }

        return issues;
    }

    private static Dictionary<int, (string Label, string FieldType, bool IsRequired, int? MaxLength)>
        ParseFieldSnapshots(JsonElement arr)
    {
        var result = new Dictionary<int, (string, string, bool, int?)>();
        foreach (var item in arr.EnumerateArray())
        {
            var id = item.GetProperty("id").GetInt32();
            var label = item.GetProperty("label").GetString() ?? "";
            var type = item.GetProperty("fieldType").GetString() ?? "Text";
            var required = item.GetProperty("isRequired").GetBoolean();
            int? maxLen = item.TryGetProperty("maxLength", out var ml) && ml.ValueKind == JsonValueKind.Number
                ? ml.GetInt32() : null;
            result[id] = (label, type, required, maxLen);
        }
        return result;
    }

    // Returns delay until next 3:00 AM Eastern time.
    private static TimeSpan TimeUntilNextRun()
    {
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Eastern);
        var target = now.Date.AddHours(3);  // 3:00 AM today
        if (now >= target) target = target.AddDays(1);  // already past → tomorrow
        var targetUtc = TimeZoneInfo.ConvertTimeToUtc(target, Eastern);
        return targetUtc - DateTime.UtcNow;
    }

    private static TimeZoneInfo GetEasternTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("America/New_York"); }
    }
}
