using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ImpWizard.Infrastructure.Data;

// Used only by `dotnet ef` CLI — not used at runtime.
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost,1433;Database=ImpWizard;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;")
            .Options;
        return new AppDbContext(options);
    }
}
