namespace ImpWizard.Infrastructure.Data;

/// <summary>
/// A single field/column definition on a Form.
/// FieldType: Text | Number | Date | Dropdown | Checkbox | Textarea
/// DataSourceType: None | ReferenceData | ProductType | UnitOfMeasure | Category | ProjectSubmission
/// LockScope: Field | EntireForm
/// </summary>
public class FormField
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public Form Form { get; set; } = null!;

    public string Label { get; set; } = string.Empty;
    public string FieldType { get; set; } = "Text";
    public bool IsRequired { get; set; } = false;
    public int SortOrder { get; set; }

    /// <summary>Soft-delete: archived fields remain on existing instances but are hidden from new ones.</summary>
    public bool IsArchived { get; set; } = false;

    // ── Dropdown data source ──────────────────────────────────────────────────

    /// <summary>None | ReferenceData | ProductType | UnitOfMeasure | Category</summary>
    public string DataSourceType { get; set; } = "None";

    /// <summary>
    /// For ReferenceData: FK to ReferenceDataSet.Id.
    /// For UnitOfMeasure: 1=Volume, 2=Weight, 3=Count, null=All.
    /// Unused for ProductType and Category (always fetch all active).
    /// </summary>
    public int? DataSourceId { get; set; }

    // ── Dependency locking ────────────────────────────────────────────────────

    /// <summary>This field (or whole form) is locked until the referenced Form's instance on the same project is Approved.</summary>
    public int? LockedUntilFormId { get; set; }
    public Form? LockedUntilForm { get; set; }

    /// <summary>Field = only this field locks; EntireForm = all fields on this form lock when any dep is unmet.</summary>
    public string LockScope { get; set; } = "Field";

    /// <summary>Optional max character length for Text and Textarea fields. Null = no limit.</summary>
    public int? MaxLength { get; set; }

    /// <summary>Override column header used in import templates. If null, falls back to Label.</summary>
    public string? ImportTemplateHeader { get; set; }

    /// <summary>When true, the dropdown renders as a combobox — options are shown as suggestions but
    /// the user may type a custom value not in the list.</summary>
    public bool AllowCustomValue { get; set; } = false;

    // ── Cross-form pre-fill ───────────────────────────────────────────────────

    /// <summary>When set, this field's default value is pulled from the most recent submitted answer
    /// for CrossFormPreFillFieldId on the same project.</summary>
    public int? CrossFormPreFillFormId { get; set; }
    public Form? CrossFormPreFillForm { get; set; }
    public int? CrossFormPreFillFieldId { get; set; }
    public FormField? CrossFormPreFillField { get; set; }

    // ── Cross-form dropdown (DataSourceType = "ProjectSubmission") ────────────

    /// <summary>When DataSourceType = "ProjectSubmission", dropdown options are all distinct submitted
    /// answers for DataSourceFieldId on the same project.</summary>
    public int? DataSourceFormId { get; set; }
    public Form? DataSourceForm { get; set; }
    public int? DataSourceFieldId { get; set; }
    public FormField? DataSourceField { get; set; }

    /// <summary>When set, this field is automatically filled with this fixed value on every
    /// submission and shown read-only on the portal. The value is enforced server-side.</summary>
    public string? AutoFillValue { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
