using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddJourneyStageCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create JourneyStageCategories table
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

            // 2. Add nullable StageCategoryId column to JourneyStages
            migrationBuilder.AddColumn<int>(
                name: "StageCategoryId",
                table: "JourneyStages",
                type: "int",
                nullable: true);

            // 4. Drop old StageCategory string column
            migrationBuilder.DropColumn(
                name: "StageCategory",
                table: "JourneyStages");

            // 6. Add foreign key
            migrationBuilder.AddForeignKey(
                name: "FK_JourneyStages_JourneyStageCategories_StageCategoryId",
                table: "JourneyStages",
                column: "StageCategoryId",
                principalTable: "JourneyStageCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // 7. Add index
            migrationBuilder.CreateIndex(
                name: "IX_JourneyStages_StageCategoryId",
                table: "JourneyStages",
                column: "StageCategoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop index
            migrationBuilder.DropIndex(
                name: "IX_JourneyStages_StageCategoryId",
                table: "JourneyStages");

            // Drop FK
            migrationBuilder.DropForeignKey(
                name: "FK_JourneyStages_JourneyStageCategories_StageCategoryId",
                table: "JourneyStages");

            // Add back StageCategory string column
            migrationBuilder.AddColumn<string>(
                name: "StageCategory",
                table: "JourneyStages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Standard");

            // Restore string values from FK
            migrationBuilder.Sql(
                "UPDATE js SET js.StageCategory = ISNULL(jsc.Name, 'Standard') FROM JourneyStages js LEFT JOIN JourneyStageCategories jsc ON jsc.Id = js.StageCategoryId");

            // Drop StageCategoryId column
            migrationBuilder.DropColumn(
                name: "StageCategoryId",
                table: "JourneyStages");

            // Drop JourneyStageCategories table
            migrationBuilder.DropTable(
                name: "JourneyStageCategories");
        }
    }
}
