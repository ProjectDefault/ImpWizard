using HtmlAgilityPack;
using System.Text.RegularExpressions;

namespace ImpWizard.Api.Services;

public class ScrapedProduct
{
    public string Name { get; set; } = string.Empty;
    public string? Style { get; set; }
    public string? SourceUrl { get; set; }
    public int CheckInCount { get; set; }
    public DateTime? LastActivityDate { get; set; }
    public bool IsDuplicate { get; set; }
    public string? DuplicateOfName { get; set; }
}

public class UntappdScraperService
{
    private readonly HttpClient _http;

    // Untappd product fields available for export column mapping
    public static readonly IReadOnlyList<string> ProductFields =
    [
        "Name", "Style", "SourceUrl", "LastActivityDate", "CheckInCount", "IsCustomerAdded"
    ];

    public UntappdScraperService(IHttpClientFactory factory)
    {
        _http = factory.CreateClient("Untappd");
    }

    /// <summary>
    /// Scrapes a brewery's full product list from Untappd, applies activity filtering,
    /// and resolves duplicates by check-in count.
    /// </summary>
    /// <param name="breweryUrl">e.g. https://untappd.com/MortalisBrewingCompany</param>
    /// <param name="rollingWindowDays">Exclude products with no activity in this many days. 0 = no filter.</param>
    public async Task<List<ScrapedProduct>> ScrapeAsync(string breweryUrl, int rollingWindowDays, CancellationToken ct = default)
    {
        var slug = ExtractSlug(breweryUrl);
        var beerPageBase = $"https://untappd.com/{slug}/beer";

        // Step 1: Collect all beers via paginated beer list
        var allBeers = await ScrapeBeerListAsync(beerPageBase, ct);

        // Step 2: Scrape activity feed to get LastActivityDate per beer
        var activityFeed = await ScrapeActivityFeedAsync(slug, rollingWindowDays, ct);

        // Step 3: Merge activity dates into product list
        foreach (var beer in allBeers)
        {
            if (beer.SourceUrl != null && activityFeed.TryGetValue(NormalizeUrl(beer.SourceUrl), out var date))
                beer.LastActivityDate = date;
        }

        // Step 4: Apply rolling window filter (only when window > 0)
        List<ScrapedProduct> filtered;
        if (rollingWindowDays > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-rollingWindowDays);
            filtered = allBeers
                .Where(b => b.LastActivityDate == null || b.LastActivityDate >= cutoff)
                .ToList();
        }
        else
        {
            filtered = allBeers;
        }

        // Step 5: Resolve duplicates (exact normalized name match, keep highest check-in count)
        return ResolveDuplicates(filtered);
    }

    // ── Beer list pagination ──────────────────────────────────────────────────

    private async Task<List<ScrapedProduct>> ScrapeBeerListAsync(string beerPageBase, CancellationToken ct)
    {
        var results = new List<ScrapedProduct>();
        int offset = 0;
        const int pageSize = 25;
        bool hasMore = true;

        while (hasMore)
        {
            ct.ThrowIfCancellationRequested();
            var url = offset == 0 ? beerPageBase : $"{beerPageBase}?offset={offset}";
            var html = await FetchHtmlAsync(url, ct);
            if (html is null) break;

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var beerNodes = doc.DocumentNode.SelectNodes("//div[contains(@class,'beer-item')]");
            if (beerNodes is null || beerNodes.Count == 0)
                break;

            foreach (var node in beerNodes)
            {
                var product = ParseBeerNode(node);
                if (product is not null)
                    results.Add(product);
            }

            hasMore = beerNodes.Count >= pageSize;
            offset += pageSize;

            // Polite delay between pages
            if (hasMore)
                await Task.Delay(400, ct);
        }

        return results;
    }

    private static ScrapedProduct? ParseBeerNode(HtmlNode node)
    {
        // Beer name
        var nameNode = node.SelectSingleNode(".//p[@class='name']") ??
                       node.SelectSingleNode(".//h4") ??
                       node.SelectSingleNode(".//*[contains(@class,'beer-name')]");
        var name = HtmlEntity.DeEntitize(nameNode?.InnerText.Trim() ?? string.Empty);
        if (string.IsNullOrWhiteSpace(name)) return null;

        // Style
        var styleNode = node.SelectSingleNode(".//p[@class='style']") ??
                        node.SelectSingleNode(".//*[contains(@class,'beer-style')]") ??
                        node.SelectSingleNode(".//em");
        var style = HtmlEntity.DeEntitize(styleNode?.InnerText.Trim() ?? string.Empty);

        // Link
        var linkNode = node.SelectSingleNode(".//a[contains(@href,'/b/')]") ??
                       node.SelectSingleNode(".//a");
        var rawHref = linkNode?.GetAttributeValue("href", string.Empty) ?? string.Empty;
        var sourceUrl = rawHref.Length > 0
            ? (rawHref.StartsWith("http") ? rawHref : $"https://untappd.com{rawHref}")
            : null;

        // Check-in count
        var countNode = node.SelectSingleNode(".//*[contains(@class,'count')]") ??
                        node.SelectSingleNode(".//*[contains(@class,'check-ins')]");
        var countText = countNode?.InnerText.Trim() ?? "";
        var checkInCount = ParseCount(countText);

        return new ScrapedProduct
        {
            Name = name,
            Style = string.IsNullOrWhiteSpace(style) ? null : style,
            SourceUrl = sourceUrl,
            CheckInCount = checkInCount,
        };
    }

    // ── Activity feed ─────────────────────────────────────────────────────────

    /// <summary>
    /// Paginates the brewery's activity feed until we hit dates older than the rolling window.
    /// Returns a map of normalized beer URL → most recent check-in date.
    /// </summary>
    private async Task<Dictionary<string, DateTime>> ScrapeActivityFeedAsync(
        string slug, int rollingWindowDays, CancellationToken ct)
    {
        var result = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);
        if (rollingWindowDays <= 0) return result;

        var cutoff = DateTime.UtcNow.AddDays(-rollingWindowDays);
        int offset = 0;
        const int pageSize = 25;
        bool keepGoing = true;

        while (keepGoing)
        {
            ct.ThrowIfCancellationRequested();
            var url = $"https://untappd.com/{slug}/activity?offset={offset}";
            var html = await FetchHtmlAsync(url, ct);
            if (html is null) break;

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var items = doc.DocumentNode.SelectNodes("//div[contains(@class,'item')]");
            if (items is null || items.Count == 0) break;

            bool hitCutoff = false;
            int found = 0;

            foreach (var item in items)
            {
                // Parse date from <abbr class="timeago" title="...">
                var dateNode = item.SelectSingleNode(".//*[@class='timeago' or contains(@class,'date')]");
                var titleAttr = dateNode?.GetAttributeValue("title", string.Empty) ?? string.Empty;
                var datetimeAttr = dateNode?.GetAttributeValue("datetime", string.Empty) ?? string.Empty;
                var innerText = dateNode?.InnerText.Trim() ?? string.Empty;
                var dateStr = titleAttr.Length > 0 ? titleAttr
                    : datetimeAttr.Length > 0 ? datetimeAttr
                    : innerText.Length > 0 ? innerText
                    : null;

                DateTime? date = null;
                if (dateStr is not null && DateTime.TryParse(dateStr, out var parsed))
                    date = parsed.ToUniversalTime();

                if (date.HasValue && date.Value < cutoff)
                {
                    hitCutoff = true;
                    break;
                }

                // Beer link
                var beerLink = item.SelectSingleNode(".//*[contains(@href,'/b/')]");
                var rawHref = beerLink?.GetAttributeValue("href", string.Empty) ?? string.Empty;
                var href = rawHref.Length > 0 ? rawHref : null;
                if (href is not null)
                {
                    var normalizedUrl = NormalizeUrl(href.StartsWith("http") ? href : $"https://untappd.com{href}");
                    if (!result.ContainsKey(normalizedUrl) && date.HasValue)
                        result[normalizedUrl] = date.Value;
                }
                found++;
            }

            keepGoing = !hitCutoff && found >= pageSize;
            offset += pageSize;

            if (keepGoing)
                await Task.Delay(400, ct);
        }

        return result;
    }

    // ── Duplicate resolution ──────────────────────────────────────────────────

    private static List<ScrapedProduct> ResolveDuplicates(List<ScrapedProduct> products)
    {
        // Group by normalized name
        var groups = products.GroupBy(p => NormalizeName(p.Name)).ToList();

        foreach (var group in groups)
        {
            var list = group.OrderByDescending(p => p.CheckInCount).ToList();
            if (list.Count <= 1) continue;

            var winner = list[0];
            for (int i = 1; i < list.Count; i++)
            {
                list[i].IsDuplicate = true;
                list[i].DuplicateOfName = winner.Name;
            }
        }

        return products;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<string?> FetchHtmlAsync(string url, CancellationToken ct)
    {
        try
        {
            var response = await _http.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadAsStringAsync(ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    private static string ExtractSlug(string url)
    {
        // https://untappd.com/MortalisBrewingCompany → MortalisBrewingCompany
        // https://untappd.com/MortalisBrewingCompany/beer → MortalisBrewingCompany
        var uri = new Uri(url.StartsWith("http") ? url : $"https://{url}");
        var segments = uri.AbsolutePath.Trim('/').Split('/');
        return segments[0];
    }

    private static string NormalizeName(string name)
    {
        // Lowercase, remove punctuation, collapse whitespace
        var lower = name.ToLowerInvariant();
        var noPunct = Regex.Replace(lower, @"[^\w\s]", "");
        return Regex.Replace(noPunct, @"\s+", " ").Trim();
    }

    private static string NormalizeUrl(string url)
    {
        // Strip query strings and trailing slashes for comparison
        try
        {
            var uri = new Uri(url);
            return $"{uri.Scheme}://{uri.Host}{uri.AbsolutePath.TrimEnd('/')}".ToLowerInvariant();
        }
        catch { return url.ToLowerInvariant().TrimEnd('/'); }
    }

    private static int ParseCount(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0;
        // Handle "1,234" or "1.2k" style counts
        var cleaned = Regex.Replace(text, @"[^\d.km]", "", RegexOptions.IgnoreCase);
        if (cleaned.EndsWith("k", StringComparison.OrdinalIgnoreCase))
            return (int)(double.TryParse(cleaned[..^1], out var k) ? k * 1000 : 0);
        if (cleaned.EndsWith("m", StringComparison.OrdinalIgnoreCase))
            return (int)(double.TryParse(cleaned[..^1], out var m) ? m * 1_000_000 : 0);
        return int.TryParse(cleaned.Replace(".", ""), out var n) ? n : 0;
    }
}
