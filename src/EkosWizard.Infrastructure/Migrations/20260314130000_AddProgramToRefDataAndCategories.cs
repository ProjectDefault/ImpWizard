using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProgramToRefDataAndCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "ReferenceDataSets",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "Categories",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceDataSets_ProgramId",
                table: "ReferenceDataSets",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ProgramId",
                table: "Categories",
                column: "ProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReferenceDataSets_Programs_ProgramId",
                table: "ReferenceDataSets",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Programs_ProgramId",
                table: "Categories",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReferenceDataSets_Programs_ProgramId",
                table: "ReferenceDataSets");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Programs_ProgramId",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_ReferenceDataSets_ProgramId",
                table: "ReferenceDataSets");

            migrationBuilder.DropIndex(
                name: "IX_Categories_ProgramId",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "ReferenceDataSets");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "Categories");
        }
    }
}
