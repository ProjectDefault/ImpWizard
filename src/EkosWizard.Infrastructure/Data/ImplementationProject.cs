namespace ImpWizard.Infrastructure.Data;

public class ImplementationProject
{
    public int Id { get; set; }

    /// <summary>Project type — "New Customer" is the only type for now.</summary>
    public string ProjectType { get; set; } = "New Customer";

    public string CustomerName { get; set; } = string.Empty;

    public string? SalesforceAccountId { get; set; }
    public string? SalesforceProjectId { get; set; }

    /// <summary>FK to AspNetUsers — the CIS assigned to this project.</summary>
    public string? AssignedSpecialistId { get; set; }
    public ApplicationUser? AssignedSpecialist { get; set; }

    /// <summary>Active | Complete | OnHold</summary>
    public string Status { get; set; } = "Active";

    public int CurrentStep { get; set; } = 1;

    public int? ProgramId { get; set; }
    public Program? Program { get; set; }

    // ── Address & Locale ──────────────────────────────────────────────────────
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? StateProvince { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? Timezone { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
