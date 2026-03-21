namespace ImpWizard.Infrastructure.Data;

/// <summary>
/// A producer's product list attached to a project.
/// SourceType: "Untappd" (extensible — future sources can be added without schema change)
/// Status: Draft | Published | Submitted
/// </summary>
public class ProducerProductList
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public ImplementationProject Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    /// <summary>Where the product data was sourced from. "Untappd" today; extensible for future sources.</summary>
    public string SourceType { get; set; } = "Untappd";

    /// <summary>The URL entered by admin for this specific project (e.g. https://untappd.com/MortalisBrewingCompany).</summary>
    public string? SourceUrl { get; set; }

    /// <summary>Rolling window in days — products with no activity older than this are excluded at scrape time.</summary>
    public int RollingWindowDays { get; set; } = 730; // 2 years default

    public string Status { get; set; } = "Draft"; // Draft | Published | Submitted

    public DateTime? LastScrapedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ProducerProduct> Products { get; set; } = [];
}
