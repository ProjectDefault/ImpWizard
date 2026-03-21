using ImpWizard.Api.Services;
using ImpWizard.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ImpWizard.Api.Controllers;

[ApiController]
[Route("api/producer-product-lists")]
[Authorize(Roles = "Admin,CIS")]
public class ProducerProductListController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UntappdScraperService _scraper;
    private readonly IAuditService _audit;

    public ProducerProductListController(AppDbContext db, UntappdScraperService scraper, IAuditService audit)
    {
        _db = db;
        _scraper = scraper;
        _audit = audit;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record ProductListSummaryDto(
        int Id, int ProjectId, string Title, string SourceType, string? SourceUrl,
        int RollingWindowDays, string Status, DateTime? LastScrapedAt,
        DateTime? PublishedAt, DateTime? SubmittedAt, int ProductCount);

    public record ProductDto(
        int Id, string Name, string? Style, string? SourceUrl,
        DateTime? LastActivityDate, int CheckInCount,
        bool IsIncluded, bool IsCustomerAdded,
        int? DuplicateOfId, string? DuplicateOfName, string? CustomerNote);

    public record ProductListDetailDto(
        int Id, int ProjectId, string Title, string SourceType, string? SourceUrl,
        int RollingWindowDays, string Status, DateTime? LastScrapedAt,
        DateTime? PublishedAt, DateTime? SubmittedAt,
        IEnumerable<ProductDto> Products);

    public record CreateListRequest(int ProjectId, string Title, string? SourceUrl, int RollingWindowDays = 730);
    public record UpdateListRequest(string? Title, string? SourceUrl, int? RollingWindowDays);
    public record ScrapePreviewRequest(string Url, int RollingWindowDays = 730);
    public record ScrapedProductDto(string Name, string? Style, string? SourceUrl, int CheckInCount,
        DateTime? LastActivityDate, bool IsDuplicate, string? DuplicateOfName);
    public record ToggleProductRequest(bool IsIncluded);
    public record AddCustomerProductRequest(string Name, string? Style, string? CustomerNote);
    public record UpdateCustomerNoteRequest(string? CustomerNote);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ProductDto ToDto(ProducerProduct p, string? duplicateOfName = null) => new(
        p.Id, p.Name, p.Style, p.SourceUrl,
        p.LastActivityDate, p.CheckInCount,
        p.IsIncluded, p.IsCustomerAdded,
        p.DuplicateOfId, duplicateOfName, p.CustomerNote);

    private async Task<bool> CanAccessProjectAsync(int projectId)
    {
        if (User.IsInRole("Admin")) return true;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        if (User.IsInRole("CIS"))
        {
            var project = await _db.Projects.FindAsync(projectId);
            if (project is null) return false;
            if (project.ProgramId is null) return true;
            return await _db.UserProgramAccess
                .AnyAsync(upa => upa.UserId == userId && upa.ProgramId == project.ProgramId);
        }
        return false;
    }

    private async Task<ProducerProductList?> LoadFullAsync(int id) =>
        await _db.ProducerProductLists
            .Include(pl => pl.Products)
            .FirstOrDefaultAsync(pl => pl.Id == id);

    private static ProductListDetailDto ToDetail(ProducerProductList pl)
    {
        var nameMap = pl.Products.ToDictionary(p => p.Id, p => p.Name);
        return new ProductListDetailDto(
            pl.Id, pl.ProjectId, pl.Title, pl.SourceType, pl.SourceUrl,
            pl.RollingWindowDays, pl.Status, pl.LastScrapedAt, pl.PublishedAt, pl.SubmittedAt,
            pl.Products.OrderBy(p => p.Name).Select(p =>
                ToDto(p, p.DuplicateOfId.HasValue && nameMap.TryGetValue(p.DuplicateOfId.Value, out var n) ? n : null)));
    }

    // ── Scrape preview (no DB write) ──────────────────────────────────────────

    [HttpPost("scrape-preview")]
    public async Task<IActionResult> ScrapePreview([FromBody] ScrapePreviewRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Url))
            return BadRequest(new { message = "URL is required." });

        try
        {
            var products = await _scraper.ScrapeAsync(req.Url.Trim(), req.RollingWindowDays, ct);
            var dtos = products.Select(p => new ScrapedProductDto(
                p.Name, p.Style, p.SourceUrl, p.CheckInCount,
                p.LastActivityDate, p.IsDuplicate, p.DuplicateOfName));
            return Ok(dtos);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = $"Scrape failed: {ex.Message}" });
        }
    }

    // ── List endpoints ────────────────────────────────────────────────────────

    [HttpGet("by-project/{projectId:int}")]
    public async Task<IActionResult> GetByProject(int projectId)
    {
        if (!await CanAccessProjectAsync(projectId)) return Forbid();

        var pl = await _db.ProducerProductLists
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId);

        if (pl is null) return Ok(null);
        return Ok(ToDetail(pl));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var pl = await LoadFullAsync(id);
        if (pl is null) return NotFound();
        if (!await CanAccessProjectAsync(pl.ProjectId)) return Forbid();
        return Ok(ToDetail(pl));
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateListRequest req)
    {
        if (!await CanAccessProjectAsync(req.ProjectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { message = "Title is required." });

        var existing = await _db.ProducerProductLists.AnyAsync(x => x.ProjectId == req.ProjectId);
        if (existing)
            return Conflict(new { message = "A product list already exists for this project." });

        var pl = new ProducerProductList
        {
            ProjectId = req.ProjectId,
            Title = req.Title.Trim(),
            SourceUrl = req.SourceUrl?.Trim(),
            RollingWindowDays = Math.Max(0, req.RollingWindowDays),
            Status = "Draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ProducerProductLists.Add(pl);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "product_list.created", "ProducerProductList", pl.Id.ToString(), pl.Title, req.ProjectId);

        var full = await LoadFullAsync(pl.Id);
        return CreatedAtAction(nameof(GetById), new { id = pl.Id }, ToDetail(full!));
    }

    // ── Update settings ───────────────────────────────────────────────────────

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateListRequest req)
    {
        var pl = await _db.ProducerProductLists.FindAsync(id);
        if (pl is null) return NotFound();
        if (!await CanAccessProjectAsync(pl.ProjectId)) return Forbid();

        if (req.Title is not null) pl.Title = req.Title.Trim();
        if (req.SourceUrl is not null) pl.SourceUrl = req.SourceUrl.Trim();
        if (req.RollingWindowDays is not null) pl.RollingWindowDays = Math.Max(0, req.RollingWindowDays.Value);
        pl.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var full = await LoadFullAsync(id);
        return Ok(ToDetail(full!));
    }

    // ── Scrape and populate ───────────────────────────────────────────────────

    [HttpPost("{id:int}/scrape")]
    public async Task<IActionResult> Scrape(int id, CancellationToken ct)
    {
        var pl = await LoadFullAsync(id);
        if (pl is null) return NotFound();
        if (!await CanAccessProjectAsync(pl.ProjectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(pl.SourceUrl))
            return BadRequest(new { message = "SourceUrl must be set before scraping." });
        if (pl.Status == "Submitted")
            return BadRequest(new { message = "Cannot re-scrape a submitted list." });

        try
        {
            var scraped = await _scraper.ScrapeAsync(pl.SourceUrl, pl.RollingWindowDays, ct);

            // Clear existing scraped products (keep customer-added ones)
            var toRemove = pl.Products.Where(p => !p.IsCustomerAdded).ToList();
            _db.ProducerProducts.RemoveRange(toRemove);

            // Build a map of winner names (for DuplicateOfId resolution in same batch)
            var winners = scraped
                .Where(s => !s.IsDuplicate)
                .ToDictionary(s => s.Name, s => s, StringComparer.OrdinalIgnoreCase);

            var savedWinners = new Dictionary<string, ProducerProduct>(StringComparer.OrdinalIgnoreCase);

            // Add winners first
            foreach (var s in scraped.Where(s => !s.IsDuplicate))
            {
                var p = new ProducerProduct
                {
                    ProducerProductListId = id,
                    Name = s.Name,
                    Style = s.Style,
                    SourceUrl = s.SourceUrl,
                    LastActivityDate = s.LastActivityDate,
                    CheckInCount = s.CheckInCount,
                    IsIncluded = true,
                    IsCustomerAdded = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.ProducerProducts.Add(p);
                savedWinners[s.Name] = p;
            }

            await _db.SaveChangesAsync();

            // Add duplicates with DuplicateOfId
            foreach (var s in scraped.Where(s => s.IsDuplicate))
            {
                var winnerEntity = s.DuplicateOfName != null && savedWinners.TryGetValue(s.DuplicateOfName, out var w) ? w : null;
                var dup = new ProducerProduct
                {
                    ProducerProductListId = id,
                    Name = s.Name,
                    Style = s.Style,
                    SourceUrl = s.SourceUrl,
                    LastActivityDate = s.LastActivityDate,
                    CheckInCount = s.CheckInCount,
                    IsIncluded = false,
                    IsCustomerAdded = false,
                    DuplicateOfId = winnerEntity?.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.ProducerProducts.Add(dup);
            }

            pl.LastScrapedAt = DateTime.UtcNow;
            pl.Status = "Draft";
            pl.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _audit.LogAsync(User, "product_list.scraped", "ProducerProductList", id.ToString(), pl.Title, pl.ProjectId);

            var full = await LoadFullAsync(id);
            return Ok(ToDetail(full!));
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = $"Scrape failed: {ex.Message}" });
        }
    }

    // ── Product include/exclude toggle (admin) ────────────────────────────────

    [HttpPatch("{id:int}/products/{productId:int}/toggle")]
    public async Task<IActionResult> ToggleProduct(int id, int productId, [FromBody] ToggleProductRequest req)
    {
        var pl = await _db.ProducerProductLists.FindAsync(id);
        if (pl is null) return NotFound();
        if (!await CanAccessProjectAsync(pl.ProjectId)) return Forbid();
        if (pl.Status == "Submitted") return BadRequest(new { message = "List is already submitted." });

        var product = await _db.ProducerProducts.FirstOrDefaultAsync(p => p.Id == productId && p.ProducerProductListId == id);
        if (product is null) return NotFound();

        product.IsIncluded = req.IsIncluded;
        product.UpdatedAt = DateTime.UtcNow;
        pl.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToDto(product));
    }

    // ── Publish to portal ─────────────────────────────────────────────────────

    [HttpPost("{id:int}/publish")]
    public async Task<IActionResult> Publish(int id)
    {
        var pl = await LoadFullAsync(id);
        if (pl is null) return NotFound();
        if (!await CanAccessProjectAsync(pl.ProjectId)) return Forbid();
        if (pl.Status == "Submitted") return BadRequest(new { message = "List is already submitted." });

        var includedCount = pl.Products.Count(p => p.IsIncluded && !p.IsCustomerAdded);
        if (includedCount == 0)
            return BadRequest(new { message = "At least one product must be included before publishing." });

        pl.Status = "Published";
        pl.PublishedAt = DateTime.UtcNow;
        pl.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "product_list.published", "ProducerProductList", id.ToString(), pl.Title, pl.ProjectId);

        return Ok(ToDetail(pl));
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var pl = await _db.ProducerProductLists.FindAsync(id);
        if (pl is null) return NotFound();

        _db.ProducerProductLists.Remove(pl);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "product_list.deleted", "ProducerProductList", id.ToString(), pl.Title, pl.ProjectId);

        return NoContent();
    }

    // ── Available product fields for import template column mapping ────────────

    [HttpGet("product-fields")]
    public IActionResult GetProductFields() =>
        Ok(UntappdScraperService.ProductFields);
}

// ── Portal-side controller (customer access) ──────────────────────────────────

[ApiController]
[Route("api/portal/product-list")]
[Authorize]
public class PortalProductListController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public PortalProductListController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public record PortalProductDto(
        int Id, string Name, string? Style, string? SourceUrl,
        bool IsIncluded, bool IsCustomerAdded, string? CustomerNote);

    public record PortalProductListDto(
        int Id, string Title, string Status, DateTime? PublishedAt, DateTime? SubmittedAt,
        IEnumerable<PortalProductDto> Products);

    public record CustomerToggleRequest(bool IsIncluded, string? CustomerNote);
    public record CustomerAddProductRequest(string Name, string? Style, string? CustomerNote);

    private async Task<bool> CanAccessProjectAsync(int projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        if (User.IsInRole("Admin") || User.IsInRole("CIS")) return true;
        return await _db.ProjectUserAccess.AnyAsync(a => a.ProjectId == projectId && a.UserId == userId);
    }

    [HttpGet("{projectId:int}")]
    public async Task<IActionResult> Get(int projectId)
    {
        if (!await CanAccessProjectAsync(projectId)) return Forbid();

        var pl = await _db.ProducerProductLists
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.Status != "Draft");

        if (pl is null) return Ok(null);

        return Ok(new PortalProductListDto(
            pl.Id, pl.Title, pl.Status, pl.PublishedAt, pl.SubmittedAt,
            pl.Products
                .Where(p => p.IsIncluded || p.IsCustomerAdded)
                .OrderBy(p => p.Name)
                .Select(p => new PortalProductDto(
                    p.Id, p.Name, p.Style, p.SourceUrl,
                    p.IsIncluded, p.IsCustomerAdded, p.CustomerNote))));
    }

    [HttpPatch("{projectId:int}/products/{productId:int}")]
    public async Task<IActionResult> UpdateProduct(int projectId, int productId, [FromBody] CustomerToggleRequest req)
    {
        if (!await CanAccessProjectAsync(projectId)) return Forbid();

        var pl = await _db.ProducerProductLists
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId);

        if (pl is null) return NotFound();
        if (pl.Status == "Submitted") return BadRequest(new { message = "This list has already been submitted." });
        if (pl.Status == "Draft") return BadRequest(new { message = "This list is not yet available." });

        var product = pl.Products.FirstOrDefault(p => p.Id == productId);
        if (product is null) return NotFound();

        product.IsIncluded = req.IsIncluded;
        product.CustomerNote = req.CustomerNote?.Trim();
        product.UpdatedAt = DateTime.UtcNow;
        pl.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpPost("{projectId:int}/products")]
    public async Task<IActionResult> AddProduct(int projectId, [FromBody] CustomerAddProductRequest req)
    {
        if (!await CanAccessProjectAsync(projectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var pl = await _db.ProducerProductLists
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId);

        if (pl is null) return NotFound();
        if (pl.Status == "Submitted") return BadRequest(new { message = "This list has already been submitted." });
        if (pl.Status == "Draft") return BadRequest(new { message = "This list is not yet available." });

        var product = new ProducerProduct
        {
            ProducerProductListId = pl.Id,
            Name = req.Name.Trim(),
            Style = req.Style?.Trim(),
            CustomerNote = req.CustomerNote?.Trim(),
            IsIncluded = true,
            IsCustomerAdded = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ProducerProducts.Add(product);
        pl.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new PortalProductDto(
            product.Id, product.Name, product.Style, product.SourceUrl,
            product.IsIncluded, product.IsCustomerAdded, product.CustomerNote));
    }

    [HttpPost("{projectId:int}/submit")]
    public async Task<IActionResult> Submit(int projectId)
    {
        if (!await CanAccessProjectAsync(projectId)) return Forbid();

        var pl = await _db.ProducerProductLists
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId);

        if (pl is null) return NotFound();
        if (pl.Status == "Submitted") return BadRequest(new { message = "Already submitted." });
        if (pl.Status == "Draft") return BadRequest(new { message = "List is not yet published." });

        var includedCount = pl.Products.Count(p => p.IsIncluded);
        if (includedCount == 0)
            return BadRequest(new { message = "At least one product must be included." });

        pl.Status = "Submitted";
        pl.SubmittedAt = DateTime.UtcNow;
        pl.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(User, "product_list.submitted", "ProducerProductList", pl.Id.ToString(), pl.Title, projectId);

        return Ok();
    }
}
