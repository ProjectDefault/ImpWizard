using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class WireCatalogItemTypeFKs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CatalogItemSubTypeId",
                table: "CatalogItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CatalogItemTypeId",
                table: "CatalogItems",
                type: "int",
                nullable: true);

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
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItemTypes", x => x.Id);
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
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CatalogItemTypeId = table.Column<int>(type: "int", nullable: false)
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
                    CatalogItemTypeId = table.Column<int>(type: "int", nullable: false)
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
                name: "CatalogItemFieldValues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CatalogItemId = table.Column<int>(type: "int", nullable: false),
                    CatalogItemTypeFieldId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogItemFieldValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CatalogItemFieldValues_CatalogItemTypeFields_CatalogItemTypeFieldId",
                        column: x => x.CatalogItemTypeFieldId,
                        principalTable: "CatalogItemTypeFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CatalogItemFieldValues_CatalogItems_CatalogItemId",
                        column: x => x.CatalogItemId,
                        principalTable: "CatalogItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_CatalogItemSubTypeId",
                table: "CatalogItems",
                column: "CatalogItemSubTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItems_CatalogItemTypeId",
                table: "CatalogItems",
                column: "CatalogItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemFieldValues_CatalogItemId",
                table: "CatalogItemFieldValues",
                column: "CatalogItemId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemFieldValues_CatalogItemTypeFieldId",
                table: "CatalogItemFieldValues",
                column: "CatalogItemTypeFieldId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemSubTypes_CatalogItemTypeId",
                table: "CatalogItemSubTypes",
                column: "CatalogItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemTypeFields_CatalogItemTypeId",
                table: "CatalogItemTypeFields",
                column: "CatalogItemTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_CatalogItemSubTypes_CatalogItemSubTypeId",
                table: "CatalogItems",
                column: "CatalogItemSubTypeId",
                principalTable: "CatalogItemSubTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_CatalogItemTypes_CatalogItemTypeId",
                table: "CatalogItems",
                column: "CatalogItemTypeId",
                principalTable: "CatalogItemTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);  // avoid multiple cascade paths
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_CatalogItemSubTypes_CatalogItemSubTypeId",
                table: "CatalogItems");

            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_CatalogItemTypes_CatalogItemTypeId",
                table: "CatalogItems");

            migrationBuilder.DropTable(
                name: "CatalogItemFieldValues");

            migrationBuilder.DropTable(
                name: "CatalogItemSubTypes");

            migrationBuilder.DropTable(
                name: "CatalogItemTypeFields");

            migrationBuilder.DropTable(
                name: "CatalogItemTypes");

            migrationBuilder.DropIndex(
                name: "IX_CatalogItems_CatalogItemSubTypeId",
                table: "CatalogItems");

            migrationBuilder.DropIndex(
                name: "IX_CatalogItems_CatalogItemTypeId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "CatalogItemSubTypeId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "CatalogItemTypeId",
                table: "CatalogItems");
        }
    }
}
