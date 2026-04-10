using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFormFieldDependsOn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DependsOnFieldId",
                table: "FormFields",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormFields_DependsOnFieldId",
                table: "FormFields",
                column: "DependsOnFieldId");

            migrationBuilder.AddForeignKey(
                name: "FK_FormFields_FormFields_DependsOnFieldId",
                table: "FormFields",
                column: "DependsOnFieldId",
                principalTable: "FormFields",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FormFields_FormFields_DependsOnFieldId",
                table: "FormFields");

            migrationBuilder.DropIndex(
                name: "IX_FormFields_DependsOnFieldId",
                table: "FormFields");

            migrationBuilder.DropColumn(
                name: "DependsOnFieldId",
                table: "FormFields");
        }
    }
}
