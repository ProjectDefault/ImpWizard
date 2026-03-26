namespace ImpWizard.Infrastructure.Data;

public class CatalogItem
{
    public int Id { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public int? ProgramId { get; set; }
    public Program? Program { get; set; }

    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public int? VendorId { get; set; }
    public Vendor? Vendor { get; set; }

    public string? VendorItemNumber { get; set; }

    /// <summary>Free-form description, e.g. "25 kg Bag"</summary>
    public string? PurchaseUomDescription { get; set; }

    public decimal? PurchaseAmountPerUom { get; set; }

    public int? PurchaseUomId { get; set; }
    public UnitOfMeasure? PurchaseUom { get; set; }

    public ICollection<ProductType> ProductTypes { get; set; } = [];
    public ICollection<ItemCategory> Categories { get; set; } = [];

    public int? CatalogItemTypeId { get; set; }
    public CatalogItemType? CatalogItemType { get; set; }

    public int? CatalogItemSubTypeId { get; set; }
    public CatalogItemSubType? CatalogItemSubType { get; set; }

    public ICollection<CatalogItemFieldValue> FieldValues { get; set; } = [];
}
