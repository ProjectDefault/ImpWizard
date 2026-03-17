namespace ImpWizard.Infrastructure.Data;

public class Vendor
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
}
