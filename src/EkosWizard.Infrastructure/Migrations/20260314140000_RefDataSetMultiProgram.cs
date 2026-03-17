using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefDataSetMultiProgram : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the old single-program FK and column
            migrationBuilder.DropForeignKey(
                name: "FK_ReferenceDataSets_Programs_ProgramId",
                table: "ReferenceDataSets");

            migrationBuilder.DropIndex(
                name: "IX_ReferenceDataSets_ProgramId",
                table: "ReferenceDataSets");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "ReferenceDataSets");

            // Create many-to-many junction table
            migrationBuilder.CreateTable(
                name: "ReferenceDataSetPrograms",
                columns: table => new
                {
                    DataSetsId = table.Column<int>(type: "int", nullable: false),
                    ProgramsId = table.Column<int>(type: "int", nullable: false),
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

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceDataSetPrograms_ProgramsId",
                table: "ReferenceDataSetPrograms",
                column: "ProgramsId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ReferenceDataSetPrograms");

            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "ReferenceDataSets",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceDataSets_ProgramId",
                table: "ReferenceDataSets",
                column: "ProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReferenceDataSets_Programs_ProgramId",
                table: "ReferenceDataSets",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
