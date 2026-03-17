namespace ImpWizard.Infrastructure.Data;

public class CatalogItemFieldValue
{
    public int Id { get; set; }
    public string Value { get; set; } = string.Empty;

    public int CatalogItemId { get; set; }
    public CatalogItem CatalogItem { get; set; } = null!;

    public int CatalogItemTypeFieldId { get; set; }
    public CatalogItemTypeField CatalogItemTypeField { get; set; } = null!;
}
