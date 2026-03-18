using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ImplementationProject> Projects => Set<ImplementationProject>();
    public DbSet<ReferenceDataSet> ReferenceDataSets => Set<ReferenceDataSet>();
    public DbSet<ReferenceDataItem> ReferenceDataItems => Set<ReferenceDataItem>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ProductType> ProductTypes => Set<ProductType>();
    public DbSet<UnitOfMeasure> UnitsOfMeasure => Set<UnitOfMeasure>();
    public DbSet<ImplementationType> ImplementationTypes => Set<ImplementationType>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<FormField> FormFields => Set<FormField>();
    public DbSet<ImportTemplate> ImportTemplates => Set<ImportTemplate>();
    public DbSet<ImportTemplateColumn> ImportTemplateColumns => Set<ImportTemplateColumn>();
    public DbSet<FormChangeQueue> FormChangeQueues => Set<FormChangeQueue>();
    public DbSet<FormProjectImpact> FormProjectImpacts => Set<FormProjectImpact>();
    public DbSet<Program> Programs => Set<Program>();
    public DbSet<UserProgramAccess> UserProgramAccess => Set<UserProgramAccess>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<ItemCategory> ItemCategories => Set<ItemCategory>();
    public DbSet<CatalogItem> CatalogItems => Set<CatalogItem>();
    public DbSet<ProjectUserAccess> ProjectUserAccess => Set<ProjectUserAccess>();
    public DbSet<Journey> Journeys => Set<Journey>();
    public DbSet<JourneyStageCategory> JourneyStageCategories => Set<JourneyStageCategory>();
    public DbSet<JourneyStage> JourneyStages => Set<JourneyStage>();
    public DbSet<JourneyItem> JourneyItems => Set<JourneyItem>();
    public DbSet<ProjectJourneyAssignment> ProjectJourneyAssignments => Set<ProjectJourneyAssignment>();
    public DbSet<ProjectMeeting> ProjectMeetings => Set<ProjectMeeting>();
    public DbSet<ProjectResource> ProjectResources => Set<ProjectResource>();
    public DbSet<ProjectFormAssignment> ProjectFormAssignments => Set<ProjectFormAssignment>();
    public DbSet<FormSubmission> FormSubmissions => Set<FormSubmission>();
    public DbSet<FormSubmissionAnswer> FormSubmissionAnswers => Set<FormSubmissionAnswer>();
    public DbSet<ResourceViewEvent> ResourceViewEvents => Set<ResourceViewEvent>();
    public DbSet<MeetingLinkClickEvent> MeetingLinkClickEvents => Set<MeetingLinkClickEvent>();
    public DbSet<MeetingCatalogEntry> MeetingCatalogEntries => Set<MeetingCatalogEntry>();
    public DbSet<ResourceCatalogEntry> ResourceCatalogEntries => Set<ResourceCatalogEntry>();
    public DbSet<MeetingType> MeetingTypes => Set<MeetingType>();
    public DbSet<ResourceType> ResourceTypes => Set<ResourceType>();
    public DbSet<AuditLogEntry> AuditLogEntries => Set<AuditLogEntry>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ImplementationProject>(e =>
        {
            e.HasOne(p => p.AssignedSpecialist)
             .WithMany()
             .HasForeignKey(p => p.AssignedSpecialistId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ReferenceDataSet>(e =>
        {
            e.HasMany(ds => ds.Items)
             .WithOne(i => i.DataSet)
             .HasForeignKey(i => i.DataSetId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(ds => ds.Category)
             .WithMany(c => c.DataSets)
             .HasForeignKey(ds => ds.CategoryId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ProductType>(e =>
        {
            e.HasMany(pt => pt.DataSets)
             .WithMany(ds => ds.ProductTypes);

            e.HasMany(pt => pt.Items)
             .WithMany(i => i.ProductTypes);

            e.HasMany(pt => pt.CatalogItems)
             .WithMany(ci => ci.ProductTypes)
             .UsingEntity(
                 "CatalogItemProductTypes",
                 r => r.HasOne(typeof(CatalogItem)).WithMany().HasForeignKey("CatalogItemsId").OnDelete(DeleteBehavior.Cascade),
                 l => l.HasOne(typeof(ProductType)).WithMany().HasForeignKey("ProductTypesId").OnDelete(DeleteBehavior.Cascade),
                 j =>
                 {
                     j.HasKey("CatalogItemsId", "ProductTypesId");
                     j.ToTable("CatalogItemProductTypes");
                 }
             );
        });

        builder.Entity<UnitOfMeasure>(e =>
        {
            e.Property(u => u.ToBaseMultiplier).HasPrecision(18, 8);
        });

        builder.Entity<Form>(e =>
        {
            e.HasMany(f => f.Fields)
             .WithOne(ff => ff.Form)
             .HasForeignKey(ff => ff.FormId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<FormField>(e =>
        {
            e.HasOne(ff => ff.LockedUntilForm)
             .WithMany()
             .HasForeignKey(ff => ff.LockedUntilFormId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasOne(ff => ff.CrossFormPreFillForm)
             .WithMany()
             .HasForeignKey(ff => ff.CrossFormPreFillFormId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasOne(ff => ff.CrossFormPreFillField)
             .WithMany()
             .HasForeignKey(ff => ff.CrossFormPreFillFieldId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasOne(ff => ff.DataSourceForm)
             .WithMany()
             .HasForeignKey(ff => ff.DataSourceFormId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasOne(ff => ff.DataSourceField)
             .WithMany()
             .HasForeignKey(ff => ff.DataSourceFieldId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });

        builder.Entity<ImportTemplate>(e =>
        {
            e.HasOne(t => t.Form)
             .WithMany()
             .HasForeignKey(t => t.FormId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasMany(t => t.Columns)
             .WithOne(c => c.ImportTemplate)
             .HasForeignKey(c => c.ImportTemplateId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<FormProjectImpact>(e =>
        {
            e.HasOne(i => i.ChangeQueue)
             .WithMany()
             .HasForeignKey(i => i.FormChangeQueueId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(i => i.Project)
             .WithMany()
             .HasForeignKey(i => i.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<UserProgramAccess>(e =>
        {
            e.HasOne(upa => upa.User)
             .WithMany()
             .HasForeignKey(upa => upa.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(upa => upa.Program)
             .WithMany(p => p.UserAccess)
             .HasForeignKey(upa => upa.ProgramId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(upa => new { upa.UserId, upa.ProgramId }).IsUnique();
        });

        // Nullable FK relationships from existing entities to Program (SetNull on delete)
        builder.Entity<ImplementationType>(e =>
        {
            e.HasOne(t => t.Program)
             .WithMany()
             .HasForeignKey(t => t.ProgramId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Form>(e =>
        {
            e.HasOne(f => f.Program)
             .WithMany()
             .HasForeignKey(f => f.ProgramId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ImportTemplate>(e =>
        {
            e.HasOne(t => t.Program)
             .WithMany()
             .HasForeignKey(t => t.ProgramId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ImplementationProject>(e =>
        {
            e.HasOne(p => p.Program)
             .WithMany()
             .HasForeignKey(p => p.ProgramId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Category>(e =>
        {
            e.HasOne(c => c.Program)
             .WithMany()
             .HasForeignKey(c => c.ProgramId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Catalog entities ─────────────────────────────────────────────────────

        builder.Entity<Vendor>(e =>
        {
            e.HasOne(v => v.Supplier)
             .WithMany(s => s.Vendors)
             .HasForeignKey(v => v.SupplierId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<CatalogItem>(e =>
        {
            e.Property(ci => ci.PurchaseAmountPerUom).HasPrecision(18, 4);

            e.HasOne(ci => ci.Program)
             .WithMany()
             .HasForeignKey(ci => ci.ProgramId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(ci => ci.Supplier)
             .WithMany()
             .HasForeignKey(ci => ci.SupplierId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(ci => ci.Vendor)
             .WithMany()
             .HasForeignKey(ci => ci.VendorId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(ci => ci.PurchaseUom)
             .WithMany()
             .HasForeignKey(ci => ci.PurchaseUomId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ItemCategory>(e =>
        {
            e.HasMany(ic => ic.CatalogItems)
             .WithMany(ci => ci.Categories)
             .UsingEntity(
                 "CatalogItemCategories",
                 r => r.HasOne(typeof(CatalogItem)).WithMany().HasForeignKey("CatalogItemsId").OnDelete(DeleteBehavior.Cascade),
                 l => l.HasOne(typeof(ItemCategory)).WithMany().HasForeignKey("ItemCategoriesId").OnDelete(DeleteBehavior.Cascade),
                 j =>
                 {
                     j.HasKey("CatalogItemsId", "ItemCategoriesId");
                     j.ToTable("CatalogItemCategories");
                 }
             );
        });

        builder.Entity<ProjectUserAccess>(e =>
        {
            e.HasOne(a => a.Project)
             .WithMany()
             .HasForeignKey(a => a.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.User)
             .WithMany()
             .HasForeignKey(a => a.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.GrantedBy)
             .WithMany()
             .HasForeignKey(a => a.GrantedByUserId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasIndex(a => new { a.ProjectId, a.UserId }).IsUnique();
        });

        builder.Entity<Journey>(e =>
        {
            e.HasOne(j => j.Program)
             .WithMany()
             .HasForeignKey(j => j.ProgramId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasMany(j => j.Stages)
             .WithOne(s => s.Journey)
             .HasForeignKey(s => s.JourneyId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<JourneyStage>(e =>
        {
            e.HasMany(s => s.Items)
             .WithOne(i => i.Stage)
             .HasForeignKey(i => i.JourneyStageId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(s => s.StageCategory)
             .WithMany()
             .HasForeignKey(s => s.StageCategoryId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<JourneyItem>(e =>
        {
            e.HasOne(i => i.Form)
             .WithMany()
             .HasForeignKey(i => i.FormId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ProjectJourneyAssignment>(e =>
        {
            e.HasOne(a => a.Project)
             .WithMany()
             .HasForeignKey(a => a.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.Journey)
             .WithMany()
             .HasForeignKey(a => a.JourneyId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.AssignedBy)
             .WithMany()
             .HasForeignKey(a => a.AssignedByUserId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });

        builder.Entity<ProjectMeeting>(e =>
        {
            e.HasOne(m => m.Project)
             .WithMany()
             .HasForeignKey(m => m.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(m => m.JourneyItem)
             .WithMany()
             .HasForeignKey(m => m.JourneyItemId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasOne(m => m.ScheduledBy)
             .WithMany()
             .HasForeignKey(m => m.ScheduledByUserId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });

        builder.Entity<ProjectResource>(e =>
        {
            e.HasOne(r => r.Project)
             .WithMany()
             .HasForeignKey(r => r.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(r => r.JourneyItem)
             .WithMany()
             .HasForeignKey(r => r.JourneyItemId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });

        builder.Entity<ProjectFormAssignment>(e =>
        {
            e.HasOne(f => f.Project)
             .WithMany()
             .HasForeignKey(f => f.ProjectId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(f => f.JourneyItem)
             .WithMany()
             .HasForeignKey(f => f.JourneyItemId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasOne(f => f.Form)
             .WithMany()
             .HasForeignKey(f => f.FormId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(f => f.AssignedTo)
             .WithMany()
             .HasForeignKey(f => f.AssignedToUserId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });

        builder.Entity<FormSubmission>(e =>
        {
            e.HasOne(s => s.ProjectFormAssignment)
             .WithMany()
             .HasForeignKey(s => s.ProjectFormAssignmentId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(s => s.SubmittedBy)
             .WithMany()
             .HasForeignKey(s => s.SubmittedByUserId)
             .OnDelete(DeleteBehavior.ClientSetNull);
        });

        builder.Entity<FormSubmissionAnswer>(e =>
        {
            e.HasOne(a => a.FormSubmission)
             .WithMany(s => s.Answers)
             .HasForeignKey(a => a.FormSubmissionId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.FormField)
             .WithMany()
             .HasForeignKey(a => a.FormFieldId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ReferenceDataSet>(e =>
        {
            e.HasMany(ds => ds.Programs)
             .WithMany()
             .UsingEntity(
                 "ReferenceDataSetPrograms",
                 r => r.HasOne(typeof(ImpWizard.Infrastructure.Data.Program)).WithMany().HasForeignKey("ProgramsId").OnDelete(DeleteBehavior.Cascade),
                 l => l.HasOne(typeof(ReferenceDataSet)).WithMany().HasForeignKey("DataSetsId").OnDelete(DeleteBehavior.Cascade),
                 j =>
                 {
                     j.HasKey("DataSetsId", "ProgramsId");
                     j.ToTable("ReferenceDataSetPrograms");
                 }
             );
        });

        builder.Entity<ResourceViewEvent>(e =>
        {
            e.HasKey(ev => ev.Id);
            e.Property(ev => ev.Id).UseIdentityColumn();

            e.HasOne(ev => ev.Resource)
             .WithMany()
             .HasForeignKey(ev => ev.ResourceId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(ev => ev.Project)
             .WithMany()
             .HasForeignKey(ev => ev.ProjectId)
             .OnDelete(DeleteBehavior.ClientSetNull);  // avoid multiple cascade paths

            e.HasOne(ev => ev.User)
             .WithMany()
             .HasForeignKey(ev => ev.UserId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasIndex(ev => new { ev.ResourceId, ev.UserId });
            e.HasIndex(ev => new { ev.ProjectId, ev.ViewedAt });
        });

        builder.Entity<MeetingLinkClickEvent>(e =>
        {
            e.HasKey(ev => ev.Id);
            e.Property(ev => ev.Id).UseIdentityColumn();

            e.HasOne(ev => ev.Meeting)
             .WithMany()
             .HasForeignKey(ev => ev.MeetingId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(ev => ev.Project)
             .WithMany()
             .HasForeignKey(ev => ev.ProjectId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasOne(ev => ev.User)
             .WithMany()
             .HasForeignKey(ev => ev.UserId)
             .OnDelete(DeleteBehavior.ClientSetNull);

            e.HasIndex(ev => new { ev.MeetingId, ev.UserId });
            e.HasIndex(ev => new { ev.ProjectId, ev.ClickedAt });
        });

        builder.Entity<AuditLogEntry>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).UseIdentityColumn();
            e.HasIndex(a => a.Timestamp);
            e.HasIndex(a => a.UserId);
            e.HasIndex(a => a.ProjectId);
            e.HasIndex(a => a.Action);
        });
    }
}
