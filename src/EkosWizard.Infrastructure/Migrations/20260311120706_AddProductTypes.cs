using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductTypeReferenceDataItem",
                columns: table => new
                {
                    ItemsId = table.Column<int>(type: "int", nullable: false),
                    ProductTypesId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductTypeReferenceDataItem", x => new { x.ItemsId, x.ProductTypesId });
                    table.ForeignKey(
                        name: "FK_ProductTypeReferenceDataItem_ProductTypes_ProductTypesId",
                        column: x => x.ProductTypesId,
                        principalTable: "ProductTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductTypeReferenceDataItem_ReferenceDataItems_ItemsId",
                        column: x => x.ItemsId,
                        principalTable: "ReferenceDataItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductTypeReferenceDataSet",
                columns: table => new
                {
                    DataSetsId = table.Column<int>(type: "int", nullable: false),
                    ProductTypesId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductTypeReferenceDataSet", x => new { x.DataSetsId, x.ProductTypesId });
                    table.ForeignKey(
                        name: "FK_ProductTypeReferenceDataSet_ProductTypes_ProductTypesId",
                        column: x => x.ProductTypesId,
                        principalTable: "ProductTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductTypeReferenceDataSet_ReferenceDataSets_DataSetsId",
                        column: x => x.DataSetsId,
                        principalTable: "ReferenceDataSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductTypeReferenceDataItem_ProductTypesId",
                table: "ProductTypeReferenceDataItem",
                column: "ProductTypesId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTypeReferenceDataSet_ProductTypesId",
                table: "ProductTypeReferenceDataSet",
                column: "ProductTypesId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductTypeReferenceDataItem");

            migrationBuilder.DropTable(
                name: "ProductTypeReferenceDataSet");

            migrationBuilder.DropTable(
                name: "ProductTypes");
        }
    }
}
