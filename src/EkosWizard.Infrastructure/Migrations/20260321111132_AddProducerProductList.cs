using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProducerProductList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItemCategories_CatalogItem_CatalogItemsId",
                table: "CatalogItemCategories");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_CatalogItem_TempId",
                table: "CatalogItem");

            migrationBuilder.RenameTable(
                name: "CatalogItem",
                newName: "CatalogItems");

            migrationBuilder.RenameColumn(
                name: "TempId",
                table: "CatalogItems",
                newName: "SortOrder");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "ReferenceDataSets",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "Projects",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "ItemCategories",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)");

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "ImportTemplates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductListField",
                table: "ImportTemplateColumns",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "ImplementationTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "Forms",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AutoFillValue",
                table: "FormFields",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "Categories",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UploadedByUserId",
                table: "BulkSubmissions",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "BulkSubmissions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)");

            migrationBuilder.AlterColumn<string>(
                name: "FileName",
                table: "BulkSubmissions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "BulkSubmissionRows",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)");

            migrationBuilder.AlterColumn<string>(
                name: "RejectionReason",
                table: "BulkSubmissionRows",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Organization",
                table: "AspNetUsers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "AspNetUsers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "AspNetUsers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "CatalogItems",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "CatalogItems",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "CatalogItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ItemName",
                table: "CatalogItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "CatalogItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PurchaseAmountPerUom",
                table: "CatalogItems",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchaseUomDescription",
                table: "CatalogItems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchaseUomId",
                table: "CatalogItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupplierId",
                table: "CatalogItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "CatalogItems",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "VendorId",
                table: "CatalogItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VendorItemNumber",
                table: "CatalogItems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_CatalogItems",
                table: "CatalogItems",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "AuditLogEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserFullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserRole = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EntityName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProjectId = table.Column<int>(type: "int", nullable: true),
                    ProjectName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Detail = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CatalogItemProductTypes",
                columns: table => new
                {
                    CatalogItemsId = table.Column<int>(type: "int", nullable: false),
                    ProductTypesId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItemProductTypes", x => new { x.CatalogItemsId, x.ProductTypesId });
                    table.ForeignKey(
                        name: "FK_CatalogItemProductTypes_CatalogItems_CatalogItemsId",
                        column: x => x.CatalogItemsId,
                        principalTable: "CatalogItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CatalogItemProductTypes_ProductTypes_ProductTypesId",
                        column: x => x.ProductTypesId,
                        principalTable: "ProductTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JourneyStageCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JourneyStageCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MeetingCatalogEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MeetingType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Goals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultDurationMinutes = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingCatalogEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MeetingTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProducerProductLists",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RollingWindowDays = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastScrapedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProducerProductLists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProducerProductLists_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Programs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Programs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ResourceCatalogEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResourceUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResourceLabel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceCatalogEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ResourceTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProducerProducts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProducerProductListId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Style = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastActivityDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckInCount = table.Column<int>(type: "int", nullable: false),
                    IsIncluded = table.Column<bool>(type: "bit", nullable: false),
                    IsCustomerAdded = table.Column<bool>(type: "bit", nullable: false),
                    DuplicateOfId = table.Column<int>(type: "int", nullable: true),
                    CustomerNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProducerProducts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProducerProducts_ProducerProductLists_ProducerProductListId",
                        column: x => x.ProducerProductListId,
                        principalTable: "ProducerProductLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProducerProducts_ProducerProducts_DuplicateOfId",
                        column: x => x.DuplicateOfId,
                        principalTable: "ProducerProducts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Journeys",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProgramId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ExternalId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Tags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Journeys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Journeys_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "Programs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ReferenceDataSetPrograms",
                columns: table => new
                {
                    DataSetsId = table.Column<int>(type: "int", nullable: false),
                    ProgramsId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceDataSetPrograms", x => new { x.DataSetsId, x.ProgramsId });
                    table.ForeignKey(
                        name: "FK_ReferenceDataSetPrograms_Programs_ProgramsId",
                        column: x => x.ProgramsId,
                        principalTable: "Programs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReferenceDataSetPrograms_ReferenceDataSets_DataSetsId",
                        column: x => x.DataSetsId,
                        principalTable: "ReferenceDataSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserProgramAccess",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProgramId = table.Column<int>(type: "int", nullable: false),
                    GrantedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserProgramAccess", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserProgramAccess_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserProgramAccess_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "Programs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Vendors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vendors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vendors_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "JourneyStages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JourneyId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    StageCategoryId = table.Column<int>(type: "int", nullable: true),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Icon = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JourneyStages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JourneyStages_JourneyStageCategories_StageCategoryId",
                        column: x => x.StageCategoryId,
                        principalTable: "JourneyStageCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_JourneyStages_Journeys_JourneyId",
                        column: x => x.JourneyId,
                        principalTable: "Journeys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectJourneyAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    JourneyId = table.Column<int>(type: "int", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssignedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SalesforceOpportunityId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChurnZeroAccountId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectJourneyAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectJourneyAssignments_AspNetUsers_AssignedByUserId",
                        column: x => x.AssignedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectJourneyAssignments_Journeys_JourneyId",
                        column: x => x.JourneyId,
                        principalTable: "Journeys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectJourneyAssignments_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JourneyItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JourneyStageId = table.Column<int>(type: "int", nullable: false),
                    ItemType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MeetingType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MeetingPurpose = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MeetingGoals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultDurationMinutes = table.Column<int>(type: "int", nullable: true),
                    ResourceType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResourceUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResourceLabel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FormId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JourneyItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JourneyItems_Forms_FormId",
                        column: x => x.FormId,
                        principalTable: "Forms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_JourneyItems_JourneyStages_JourneyStageId",
                        column: x => x.JourneyStageId,
                        principalTable: "JourneyStages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectFormAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    JourneyItemId = table.Column<int>(type: "int", nullable: true),
                    FormId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AssignedToUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectFormAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectFormAssignments_AspNetUsers_AssignedToUserId",
                        column: x => x.AssignedToUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectFormAssignments_Forms_FormId",
                        column: x => x.FormId,
                        principalTable: "Forms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectFormAssignments_JourneyItems_JourneyItemId",
                        column: x => x.JourneyItemId,
                        principalTable: "JourneyItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectFormAssignments_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectMeetings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    JourneyItemId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MeetingType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Goals = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationMinutes = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MeetingUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordingUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ScheduledByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    ZoomMeetingId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ZoomJoinUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GongCallId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectMeetings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectMeetings_AspNetUsers_ScheduledByUserId",
                        column: x => x.ScheduledByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectMeetings_JourneyItems_JourneyItemId",
                        column: x => x.JourneyItemId,
                        principalTable: "JourneyItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectMeetings_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectResources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    JourneyItemId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResourceUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    GoogleDriveFileId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectResources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectResources_JourneyItems_JourneyItemId",
                        column: x => x.JourneyItemId,
                        principalTable: "JourneyItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectResources_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FormSubmissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectFormAssignmentId = table.Column<int>(type: "int", nullable: false),
                    SubmittedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormSubmissions_AspNetUsers_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FormSubmissions_ProjectFormAssignments_ProjectFormAssignmentId",
                        column: x => x.ProjectFormAssignmentId,
                        principalTable: "ProjectFormAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MeetingLinkClickEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MeetingId = table.Column<int>(type: "int", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClickedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingLinkClickEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingLinkClickEvents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MeetingLinkClickEvents_ProjectMeetings_MeetingId",
                        column: x => x.MeetingId,
                        principalTable: "ProjectMeetings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingLinkClickEvents_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ResourceViewEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResourceId = table.Column<int>(type: "int", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceViewEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResourceViewEvents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ResourceViewEvents_ProjectResources_ResourceId",
                        column: x => x.ResourceId,
                        principalTable: "ProjectResources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ResourceViewEvents_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FormSubmissionAnswers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FormSubmissionId = table.Column<int>(type: "int", nullable: false),
                    FormFieldId = table.Column<int>(type: "int", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormSubmissionAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormSubmissionAnswers_FormFields_FormFieldId",
                        column: x => x.FormFieldId,
                        principalTable: "FormFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FormSubmissionAnswers_FormSubmissions_FormSubmissionId",
                        column: x => x.FormSubmissionId,
                        principalTable: "FormSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ProgramId",
                table: "Projects",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportTemplates_ProgramId",
                table: "ImportTemplates",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_ImplementationTypes_ProgramId",
                table: "ImplementationTypes",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_Forms_ProgramId",
                table: "Forms",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ProgramId",
                table: "Categories",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_BulkSubmissionRows_ResultFormSubmissionId",
                table: "BulkSubmissionRows",
                column: "ResultFormSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_ProgramId",
                table: "CatalogItems",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_PurchaseUomId",
                table: "CatalogItems",
                column: "PurchaseUomId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_SupplierId",
                table: "CatalogItems",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_VendorId",
                table: "CatalogItems",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogEntries_Action",
                table: "AuditLogEntries",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogEntries_ProjectId",
                table: "AuditLogEntries",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogEntries_Timestamp",
                table: "AuditLogEntries",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogEntries_UserId",
                table: "AuditLogEntries",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemProductTypes_ProductTypesId",
                table: "CatalogItemProductTypes",
                column: "ProductTypesId");

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissionAnswers_FormFieldId",
                table: "FormSubmissionAnswers",
                column: "FormFieldId");

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissionAnswers_FormSubmissionId",
                table: "FormSubmissionAnswers",
                column: "FormSubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_ProjectFormAssignmentId",
                table: "FormSubmissions",
                column: "ProjectFormAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_SubmittedByUserId",
                table: "FormSubmissions",
                column: "SubmittedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_JourneyItems_FormId",
                table: "JourneyItems",
                column: "FormId");

            migrationBuilder.CreateIndex(
                name: "IX_JourneyItems_JourneyStageId",
                table: "JourneyItems",
                column: "JourneyStageId");

            migrationBuilder.CreateIndex(
                name: "IX_Journeys_ProgramId",
                table: "Journeys",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_JourneyStages_JourneyId",
                table: "JourneyStages",
                column: "JourneyId");

            migrationBuilder.CreateIndex(
                name: "IX_JourneyStages_StageCategoryId",
                table: "JourneyStages",
                column: "StageCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingLinkClickEvents_MeetingId_UserId",
                table: "MeetingLinkClickEvents",
                columns: new[] { "MeetingId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingLinkClickEvents_ProjectId_ClickedAt",
                table: "MeetingLinkClickEvents",
                columns: new[] { "ProjectId", "ClickedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingLinkClickEvents_UserId",
                table: "MeetingLinkClickEvents",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProducerProductLists_ProjectId",
                table: "ProducerProductLists",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProducerProducts_DuplicateOfId",
                table: "ProducerProducts",
                column: "DuplicateOfId");

            migrationBuilder.CreateIndex(
                name: "IX_ProducerProducts_ProducerProductListId",
                table: "ProducerProducts",
                column: "ProducerProductListId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectFormAssignments_AssignedToUserId",
                table: "ProjectFormAssignments",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectFormAssignments_FormId",
                table: "ProjectFormAssignments",
                column: "FormId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectFormAssignments_JourneyItemId",
                table: "ProjectFormAssignments",
                column: "JourneyItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectFormAssignments_ProjectId",
                table: "ProjectFormAssignments",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectJourneyAssignments_AssignedByUserId",
                table: "ProjectJourneyAssignments",
                column: "AssignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectJourneyAssignments_JourneyId",
                table: "ProjectJourneyAssignments",
                column: "JourneyId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectJourneyAssignments_ProjectId",
                table: "ProjectJourneyAssignments",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMeetings_JourneyItemId",
                table: "ProjectMeetings",
                column: "JourneyItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMeetings_ProjectId",
                table: "ProjectMeetings",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMeetings_ScheduledByUserId",
                table: "ProjectMeetings",
                column: "ScheduledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectResources_JourneyItemId",
                table: "ProjectResources",
                column: "JourneyItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectResources_ProjectId",
                table: "ProjectResources",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceDataSetPrograms_ProgramsId",
                table: "ReferenceDataSetPrograms",
                column: "ProgramsId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceViewEvents_ProjectId_ViewedAt",
                table: "ResourceViewEvents",
                columns: new[] { "ProjectId", "ViewedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ResourceViewEvents_ResourceId_UserId",
                table: "ResourceViewEvents",
                columns: new[] { "ResourceId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ResourceViewEvents_UserId",
                table: "ResourceViewEvents",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserProgramAccess_ProgramId",
                table: "UserProgramAccess",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_UserProgramAccess_UserId_ProgramId",
                table: "UserProgramAccess",
                columns: new[] { "UserId", "ProgramId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vendors_SupplierId",
                table: "Vendors",
                column: "SupplierId");

            migrationBuilder.AddForeignKey(
                name: "FK_BulkSubmissionCells_BulkSubmissionRows_BulkSubmissionRowId",
                table: "BulkSubmissionCells",
                column: "BulkSubmissionRowId",
                principalTable: "BulkSubmissionRows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BulkSubmissionCells_FormFields_FormFieldId",
                table: "BulkSubmissionCells",
                column: "FormFieldId",
                principalTable: "FormFields",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BulkSubmissionRows_BulkSubmissions_BulkSubmissionId",
                table: "BulkSubmissionRows",
                column: "BulkSubmissionId",
                principalTable: "BulkSubmissions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BulkSubmissionRows_FormSubmissions_ResultFormSubmissionId",
                table: "BulkSubmissionRows",
                column: "ResultFormSubmissionId",
                principalTable: "FormSubmissions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BulkSubmissions_ProjectFormAssignments_ProjectFormAssignmentId",
                table: "BulkSubmissions",
                column: "ProjectFormAssignmentId",
                principalTable: "ProjectFormAssignments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItemCategories_CatalogItems_CatalogItemsId",
                table: "CatalogItemCategories",
                column: "CatalogItemsId",
                principalTable: "CatalogItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_Programs_ProgramId",
                table: "CatalogItems",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_Suppliers_SupplierId",
                table: "CatalogItems",
                column: "SupplierId",
                principalTable: "Suppliers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_UnitsOfMeasure_PurchaseUomId",
                table: "CatalogItems",
                column: "PurchaseUomId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_Vendors_VendorId",
                table: "CatalogItems",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Programs_ProgramId",
                table: "Categories",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Forms_Programs_ProgramId",
                table: "Forms",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ImplementationTypes_Programs_ProgramId",
                table: "ImplementationTypes",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ImportTemplates_Programs_ProgramId",
                table: "ImportTemplates",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Programs_ProgramId",
                table: "Projects",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BulkSubmissionCells_BulkSubmissionRows_BulkSubmissionRowId",
                table: "BulkSubmissionCells");

            migrationBuilder.DropForeignKey(
                name: "FK_BulkSubmissionCells_FormFields_FormFieldId",
                table: "BulkSubmissionCells");

            migrationBuilder.DropForeignKey(
                name: "FK_BulkSubmissionRows_BulkSubmissions_BulkSubmissionId",
                table: "BulkSubmissionRows");

            migrationBuilder.DropForeignKey(
                name: "FK_BulkSubmissionRows_FormSubmissions_ResultFormSubmissionId",
                table: "BulkSubmissionRows");

            migrationBuilder.DropForeignKey(
                name: "FK_BulkSubmissions_ProjectFormAssignments_ProjectFormAssignmentId",
                table: "BulkSubmissions");

            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItemCategories_CatalogItems_CatalogItemsId",
                table: "CatalogItemCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_Programs_ProgramId",
                table: "CatalogItems");

            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_Suppliers_SupplierId",
                table: "CatalogItems");

            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_UnitsOfMeasure_PurchaseUomId",
                table: "CatalogItems");

            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_Vendors_VendorId",
                table: "CatalogItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Programs_ProgramId",
                table: "Categories");

            migrationBuilder.DropForeignKey(
                name: "FK_Forms_Programs_ProgramId",
                table: "Forms");

            migrationBuilder.DropForeignKey(
                name: "FK_ImplementationTypes_Programs_ProgramId",
                table: "ImplementationTypes");

            migrationBuilder.DropForeignKey(
                name: "FK_ImportTemplates_Programs_ProgramId",
                table: "ImportTemplates");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Programs_ProgramId",
                table: "Projects");

            migrationBuilder.DropTable(
                name: "AuditLogEntries");

            migrationBuilder.DropTable(
                name: "CatalogItemProductTypes");

            migrationBuilder.DropTable(
                name: "FormSubmissionAnswers");

            migrationBuilder.DropTable(
                name: "MeetingCatalogEntries");

            migrationBuilder.DropTable(
                name: "MeetingLinkClickEvents");

            migrationBuilder.DropTable(
                name: "MeetingTypes");

            migrationBuilder.DropTable(
                name: "ProducerProducts");

            migrationBuilder.DropTable(
                name: "ProjectJourneyAssignments");

            migrationBuilder.DropTable(
                name: "ReferenceDataSetPrograms");

            migrationBuilder.DropTable(
                name: "ResourceCatalogEntries");

            migrationBuilder.DropTable(
                name: "ResourceTypes");

            migrationBuilder.DropTable(
                name: "ResourceViewEvents");

            migrationBuilder.DropTable(
                name: "UserProgramAccess");

            migrationBuilder.DropTable(
                name: "Vendors");

            migrationBuilder.DropTable(
                name: "FormSubmissions");

            migrationBuilder.DropTable(
                name: "ProjectMeetings");

            migrationBuilder.DropTable(
                name: "ProducerProductLists");

            migrationBuilder.DropTable(
                name: "ProjectResources");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "ProjectFormAssignments");

            migrationBuilder.DropTable(
                name: "JourneyItems");

            migrationBuilder.DropTable(
                name: "JourneyStages");

            migrationBuilder.DropTable(
                name: "JourneyStageCategories");

            migrationBuilder.DropTable(
                name: "Journeys");

            migrationBuilder.DropTable(
                name: "Programs");

            migrationBuilder.DropIndex(
                name: "IX_Projects_ProgramId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_ImportTemplates_ProgramId",
                table: "ImportTemplates");

            migrationBuilder.DropIndex(
                name: "IX_ImplementationTypes_ProgramId",
                table: "ImplementationTypes");

            migrationBuilder.DropIndex(
                name: "IX_Forms_ProgramId",
                table: "Forms");

            migrationBuilder.DropIndex(
                name: "IX_Categories_ProgramId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_BulkSubmissionRows_ResultFormSubmissionId",
                table: "BulkSubmissionRows");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CatalogItems",
                table: "CatalogItems");

            migrationBuilder.DropIndex(
                name: "IX_CatalogItems_ProgramId",
                table: "CatalogItems");

            migrationBuilder.DropIndex(
                name: "IX_CatalogItems_PurchaseUomId",
                table: "CatalogItems");

            migrationBuilder.DropIndex(
                name: "IX_CatalogItems_SupplierId",
                table: "CatalogItems");

            migrationBuilder.DropIndex(
                name: "IX_CatalogItems_VendorId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "ImportTemplates");

            migrationBuilder.DropColumn(
                name: "ProductListField",
                table: "ImportTemplateColumns");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "ImplementationTypes");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Organization",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "ItemName",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "PurchaseAmountPerUom",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "PurchaseUomDescription",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "PurchaseUomId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "VendorItemNumber",
                table: "CatalogItems");

            migrationBuilder.RenameTable(
                name: "CatalogItems",
                newName: "CatalogItem");

            migrationBuilder.RenameColumn(
                name: "SortOrder",
                table: "CatalogItem",
                newName: "TempId");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "ReferenceDataSets",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "ItemCategories",
                type: "nvarchar(200)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "AutoFillValue",
                table: "FormFields",
                type: "nvarchar(500)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UploadedByUserId",
                table: "BulkSubmissions",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "BulkSubmissions",
                type: "nvarchar(50)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "FileName",
                table: "BulkSubmissions",
                type: "nvarchar(500)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "BulkSubmissionRows",
                type: "nvarchar(50)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "RejectionReason",
                table: "BulkSubmissionRows",
                type: "nvarchar(1000)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_CatalogItem_TempId",
                table: "CatalogItem",
                column: "TempId");

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItemCategories_CatalogItem_CatalogItemsId",
                table: "CatalogItemCategories",
                column: "CatalogItemsId",
                principalTable: "CatalogItem",
                principalColumn: "TempId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
