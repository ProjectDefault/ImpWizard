using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ImpWizard.Infrastructure.Migrations;

/// <inheritdoc />
public partial class AddReferenceDataSetIsActive : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Applied directly via SQL — see migration notes.
        // ALTER TABLE ReferenceDataSets ADD IsActive BIT NOT NULL DEFAULT 1;
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
