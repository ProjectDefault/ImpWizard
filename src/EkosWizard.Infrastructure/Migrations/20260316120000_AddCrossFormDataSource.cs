using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCrossFormDataSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Pre-fill source columns
            migrationBuilder.AddColumn<int>(
                name: "CrossFormPreFillFormId",
                table: "FormFields",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CrossFormPreFillFieldId",
                table: "FormFields",
                type: "int",
                nullable: true);

            // ProjectSubmission dropdown source columns
            migrationBuilder.AddColumn<int>(
                name: "DataSourceFormId",
                table: "FormFields",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DataSourceFieldId",
                table: "FormFields",
                type: "int",
                nullable: true);

            // Indexes
            migrationBuilder.CreateIndex(
                name: "IX_FormFields_CrossFormPreFillFormId",
                table: "FormFields",
                column: "CrossFormPreFillFormId");

            migrationBuilder.CreateIndex(
                name: "IX_FormFields_CrossFormPreFillFieldId",
                table: "FormFields",
                column: "CrossFormPreFillFieldId");

            migrationBuilder.CreateIndex(
                name: "IX_FormFields_DataSourceFormId",
                table: "FormFields",
                column: "DataSourceFormId");

            migrationBuilder.CreateIndex(
                name: "IX_FormFields_DataSourceFieldId",
                table: "FormFields",
                column: "DataSourceFieldId");

            // FK: CrossFormPreFillFormId -> Forms.Id (SetNull on delete)
            migrationBuilder.AddForeignKey(
                name: "FK_FormFields_Forms_CrossFormPreFillFormId",
                table: "FormFields",
                column: "CrossFormPreFillFormId",
                principalTable: "Forms",
                principalColumn: "Id");

            // FK: CrossFormPreFillFieldId -> FormFields.Id (NoAction — self-ref)
            migrationBuilder.AddForeignKey(
                name: "FK_FormFields_FormFields_CrossFormPreFillFieldId",
                table: "FormFields",
                column: "CrossFormPreFillFieldId",
                principalTable: "FormFields",
                principalColumn: "Id");

            // FK: DataSourceFormId -> Forms.Id
            migrationBuilder.AddForeignKey(
                name: "FK_FormFields_Forms_DataSourceFormId",
                table: "FormFields",
                column: "DataSourceFormId",
                principalTable: "Forms",
                principalColumn: "Id");

            // FK: DataSourceFieldId -> FormFields.Id (NoAction — self-ref)
            migrationBuilder.AddForeignKey(
                name: "FK_FormFields_FormFields_DataSourceFieldId",
                table: "FormFields",
                column: "DataSourceFieldId",
                principalTable: "FormFields",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FormFields_Forms_CrossFormPreFillFormId",
                table: "FormFields");

            migrationBuilder.DropForeignKey(
                name: "FK_FormFields_FormFields_CrossFormPreFillFieldId",
                table: "FormFields");

            migrationBuilder.DropForeignKey(
                name: "FK_FormFields_Forms_DataSourceFormId",
                table: "FormFields");

            migrationBuilder.DropForeignKey(
                name: "FK_FormFields_FormFields_DataSourceFieldId",
                table: "FormFields");

            migrationBuilder.DropIndex(name: "IX_FormFields_CrossFormPreFillFormId", table: "FormFields");
            migrationBuilder.DropIndex(name: "IX_FormFields_CrossFormPreFillFieldId", table: "FormFields");
            migrationBuilder.DropIndex(name: "IX_FormFields_DataSourceFormId", table: "FormFields");
            migrationBuilder.DropIndex(name: "IX_FormFields_DataSourceFieldId", table: "FormFields");

            migrationBuilder.DropColumn(name: "CrossFormPreFillFormId", table: "FormFields");
            migrationBuilder.DropColumn(name: "CrossFormPreFillFieldId", table: "FormFields");
            migrationBuilder.DropColumn(name: "DataSourceFormId", table: "FormFields");
            migrationBuilder.DropColumn(name: "DataSourceFieldId", table: "FormFields");
        }
    }
}
