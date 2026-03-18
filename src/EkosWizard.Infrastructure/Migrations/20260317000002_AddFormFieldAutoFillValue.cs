using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations;

/// <inheritdoc />
public partial class AddFormFieldAutoFillValue : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Applied directly via SQL — see migration notes.
        // ALTER TABLE FormFields ADD AutoFillValue NVARCHAR(500) NULL;
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
