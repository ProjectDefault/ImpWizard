using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrograms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Programs table
            migrationBuilder.CreateTable(
                name: "Programs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Color = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Programs", x => x.Id);
                });

            // UserProgramAccess table
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

            migrationBuilder.CreateIndex(
                name: "IX_UserProgramAccess_UserId_ProgramId",
                table: "UserProgramAccess",
                columns: new[] { "UserId", "ProgramId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserProgramAccess_ProgramId",
                table: "UserProgramAccess",
                column: "ProgramId");

            // Add ProgramId FK to ImplementationTypes
            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "ImplementationTypes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImplementationTypes_ProgramId",
                table: "ImplementationTypes",
                column: "ProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_ImplementationTypes_Programs_ProgramId",
                table: "ImplementationTypes",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Add ProgramId FK to Forms
            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "Forms",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Forms_ProgramId",
                table: "Forms",
                column: "ProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_Forms_Programs_ProgramId",
                table: "Forms",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Add ProgramId FK to ImportTemplates
            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "ImportTemplates",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportTemplates_ProgramId",
                table: "ImportTemplates",
                column: "ProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_ImportTemplates_Programs_ProgramId",
                table: "ImportTemplates",
                column: "ProgramId",
                principalTable: "Programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Add ProgramId FK to Projects
            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "Projects",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ProgramId",
                table: "Projects",
                column: "ProgramId");

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
            migrationBuilder.DropForeignKey(name: "FK_ImplementationTypes_Programs_ProgramId", table: "ImplementationTypes");
            migrationBuilder.DropForeignKey(name: "FK_Forms_Programs_ProgramId", table: "Forms");
            migrationBuilder.DropForeignKey(name: "FK_ImportTemplates_Programs_ProgramId", table: "ImportTemplates");
            migrationBuilder.DropForeignKey(name: "FK_Projects_Programs_ProgramId", table: "Projects");

            migrationBuilder.DropIndex(name: "IX_ImplementationTypes_ProgramId", table: "ImplementationTypes");
            migrationBuilder.DropIndex(name: "IX_Forms_ProgramId", table: "Forms");
            migrationBuilder.DropIndex(name: "IX_ImportTemplates_ProgramId", table: "ImportTemplates");
            migrationBuilder.DropIndex(name: "IX_Projects_ProgramId", table: "Projects");

            migrationBuilder.DropColumn(name: "ProgramId", table: "ImplementationTypes");
            migrationBuilder.DropColumn(name: "ProgramId", table: "Forms");
            migrationBuilder.DropColumn(name: "ProgramId", table: "ImportTemplates");
            migrationBuilder.DropColumn(name: "ProgramId", table: "Projects");

            migrationBuilder.DropTable(name: "UserProgramAccess");
            migrationBuilder.DropTable(name: "Programs");
        }
    }
}
