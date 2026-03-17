using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CatalogItemTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItemTypes", x => x.Id);
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
                    SupplierId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                name: "CatalogItemSubTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CatalogItemTypeId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItemSubTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogItemSubTypes_CatalogItemTypes_CatalogItemTypeId",
                        column: x => x.CatalogItemTypeId,
                        principalTable: "CatalogItemTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CatalogItemTypeFields",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FieldName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FieldLabel = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FieldType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CatalogItemTypeId = table.Column<int>(type: "int", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItemTypeFields", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogItemTypeFields_CatalogItemTypes_CatalogItemTypeId",
                        column: x => x.CatalogItemTypeId,
                        principalTable: "CatalogItemTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CatalogItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ProgramId = table.Column<int>(type: "int", nullable: true),
                    CatalogItemTypeId = table.Column<int>(type: "int", nullable: true),
                    CatalogItemSubTypeId = table.Column<int>(type: "int", nullable: true),
                    SupplierId = table.Column<int>(type: "int", nullable: true),
                    VendorId = table.Column<int>(type: "int", nullable: true),
                    VendorItemNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PurchaseUomDescription = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PurchaseAmountPerUom = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    PurchaseUomId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogItems_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "Programs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CatalogItems_CatalogItemTypes_CatalogItemTypeId",
                        column: x => x.CatalogItemTypeId,
                        principalTable: "CatalogItemTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_CatalogItems_CatalogItemSubTypes_CatalogItemSubTypeId",
                        column: x => x.CatalogItemSubTypeId,
                        principalTable: "CatalogItemSubTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_CatalogItems_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CatalogItems_Vendors_VendorId",
                        column: x => x.VendorId,
                        principalTable: "Vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CatalogItems_UnitsOfMeasure_PurchaseUomId",
                        column: x => x.PurchaseUomId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CatalogItemFieldValues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CatalogItemId = table.Column<int>(type: "int", nullable: false),
                    CatalogItemTypeFieldId = table.Column<int>(type: "int", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItemFieldValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogItemFieldValues_CatalogItems_CatalogItemId",
                        column: x => x.CatalogItemId,
                        principalTable: "CatalogItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CatalogItemFieldValues_CatalogItemTypeFields_CatalogItemTypeFieldId",
                        column: x => x.CatalogItemTypeFieldId,
                        principalTable: "CatalogItemTypeFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CatalogItemProductTypes",
                columns: table => new
                {
                    CatalogItemsId = table.Column<int>(type: "int", nullable: false),
                    ProductTypesId = table.Column<int>(type: "int", nullable: false),
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

            // Indexes
            migrationBuilder.CreateIndex(
                name: "IX_Vendors_SupplierId",
                table: "Vendors",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemSubTypes_CatalogItemTypeId",
                table: "CatalogItemSubTypes",
                column: "CatalogItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemTypeFields_CatalogItemTypeId",
                table: "CatalogItemTypeFields",
                column: "CatalogItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_ProgramId",
                table: "CatalogItems",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_CatalogItemTypeId",
                table: "CatalogItems",
                column: "CatalogItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_CatalogItemSubTypeId",
                table: "CatalogItems",
                column: "CatalogItemSubTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_SupplierId",
                table: "CatalogItems",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_VendorId",
                table: "CatalogItems",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_PurchaseUomId",
                table: "CatalogItems",
                column: "PurchaseUomId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemFieldValues_CatalogItemId",
                table: "CatalogItemFieldValues",
                column: "CatalogItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemFieldValues_CatalogItemTypeFieldId",
                table: "CatalogItemFieldValues",
                column: "CatalogItemTypeFieldId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemProductTypes_ProductTypesId",
                table: "CatalogItemProductTypes",
                column: "ProductTypesId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "CatalogItemProductTypes");
            migrationBuilder.DropTable(name: "CatalogItemFieldValues");
            migrationBuilder.DropTable(name: "CatalogItems");
            migrationBuilder.DropTable(name: "CatalogItemTypeFields");
            migrationBuilder.DropTable(name: "CatalogItemSubTypes");
            migrationBuilder.DropTable(name: "CatalogItemTypes");
            migrationBuilder.DropTable(name: "Vendors");
            migrationBuilder.DropTable(name: "Suppliers");
        }
    }
}
