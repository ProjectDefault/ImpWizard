using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAddressFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AddressLine1",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressLine2",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StateProvince",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Timezone",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CatalogItemId1",
                table: "CatalogItemFieldValues",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CatalogItemFieldValues_CatalogItemId1",
                table: "CatalogItemFieldValues",
                column: "CatalogItemId1");

            migrationBuilder.AddForeignKey(
                name: "FK_CatalogItemFieldValues_CatalogItems_CatalogItemId1",
                table: "CatalogItemFieldValues",
                column: "CatalogItemId1",
                principalTable: "CatalogItems",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CatalogItemFieldValues_CatalogItems_CatalogItemId1",
                table: "CatalogItemFieldValues");

            migrationBuilder.DropIndex(
                name: "IX_CatalogItemFieldValues_CatalogItemId1",
                table: "CatalogItemFieldValues");

            migrationBuilder.DropColumn(
                name: "AddressLine1",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "AddressLine2",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "StateProvince",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Timezone",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "CatalogItemId1",
                table: "CatalogItemFieldValues");
        }
    }
}
