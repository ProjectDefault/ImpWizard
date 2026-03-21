namespace ImpWizard.Infrastructure.Data;

/// <summary>
/// A single product/beer within a ProducerProductList.
/// </summary>
public class ProducerProduct
{
    public int Id { get; set; }
    public int ProducerProductListId { get; set; }
    public ProducerProductList List { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Style { get; set; }

    /// <summary>Direct URL to this product on the source platform (e.g. Untappd beer page).</summary>
    public string? SourceUrl { get; set; }

    /// <summary>Most recent activity date found from the source's activity feed. Null = not found in feed.</summary>
    public DateTime? LastActivityDate { get; set; }

    /// <summary>Check-in / review count from the source. Used for duplicate resolution.</summary>
    public int CheckInCount { get; set; }

    /// <summary>Whether this product is included in the final list. Admin default: true.</summary>
    public bool IsIncluded { get; set; } = true;

    /// <summary>True if this product was added manually by the customer (not from the scrape).</summary>
    public bool IsCustomerAdded { get; set; }

    /// <summary>
    /// When set, this product was auto-discarded as a duplicate.
    /// Points to the product that was kept (higher check-in count).
    /// </summary>
    public int? DuplicateOfId { get; set; }
    public ProducerProduct? DuplicateOf { get; set; }

    /// <summary>Optional note from the customer.</summary>
    public string? CustomerNote { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
