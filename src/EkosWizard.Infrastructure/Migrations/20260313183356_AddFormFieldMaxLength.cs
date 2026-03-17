using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFormFieldMaxLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FormFields_Forms_LockedUntilFormId",
                table: "FormFields");

            migrationBuilder.AddColumn<int>(
                name: "MaxLength",
                table: "FormFields",
                type: "int",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_FormFields_Forms_LockedUntilFormId",
                table: "FormFields",
                column: "LockedUntilFormId",
                principalTable: "Forms",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FormFields_Forms_LockedUntilFormId",
                table: "FormFields");

            migrationBuilder.DropColumn(
                name: "MaxLength",
                table: "FormFields");

            migrationBuilder.AddForeignKey(
                name: "FK_FormFields_Forms_LockedUntilFormId",
                table: "FormFields",
                column: "LockedUntilFormId",
                principalTable: "Forms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
