namespace ImpWizard.Infrastructure.Data;

public class CatalogItemTypeField
{
    public int Id { get; set; }

    /// <summary>Machine key, e.g. "alpha_acid". Used as the key in field value lookups.</summary>
    public string FieldName { get; set; } = string.Empty;

    /// <summary>Display label, e.g. "Alpha Acid %".</summary>
    public string FieldLabel { get; set; } = string.Empty;

    /// <summary>One of: "Text", "Number", "Boolean"</summary>
    public string FieldType { get; set; } = "Text";

    public bool IsRequired { get; set; } = false;
    public int SortOrder { get; set; }

    public int CatalogItemTypeId { get; set; }
    public CatalogItemType CatalogItemType { get; set; } = null!;
}
