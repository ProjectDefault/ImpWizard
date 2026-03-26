using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogItemTypeFieldIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_CatalogItemTypes_CatalogItemTypeId",
                table: "CatalogItems");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "CatalogItemTypeFields",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_CatalogItemTypes_CatalogItemTypeId",
                table: "CatalogItems",
                column: "CatalogItemTypeId",
                principalTable: "CatalogItemTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItems_CatalogItemTypes_CatalogItemTypeId",
                table: "CatalogItems");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "CatalogItemTypeFields");

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItems_CatalogItemTypes_CatalogItemTypeId",
                table: "CatalogItems",
                column: "CatalogItemTypeId",
                principalTable: "CatalogItemTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
