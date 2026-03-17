using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ImpWizard.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, AppDbContext db)
    {
        // Ensure roles exist
        string[] roles = ["Admin", "CIS", "SuperCustomer", "Customer"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed the super-admin user
        const string adminUserName = "admin";
        const string adminEmail = "admin@impwizard.local";
        const string adminPassword = "Beer123!";

        var existingAdmin = await userManager.FindByNameAsync(adminUserName);
        if (existingAdmin is null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminUserName,
                Email = adminEmail,
                FullName = "Super Admin",
                EmailConfirmed = true,
            };

            var result = await userManager.CreateAsync(admin, adminPassword);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(admin, "Admin");
        }
        else if (existingAdmin.Email != adminEmail)
        {
            existingAdmin.Email = adminEmail;
            existingAdmin.NormalizedEmail = adminEmail.ToUpperInvariant();
            await userManager.UpdateAsync(existingAdmin);
        }

        // Seed units of measure
        if (!await db.UnitsOfMeasure.AnyAsync())
        {
            var now = DateTime.UtcNow;
            db.UnitsOfMeasure.AddRange(
                // Volume — base: Liter
                new UnitOfMeasure { Name = "Barrel(s)",      Abbreviation = "bbl",   UnitCategory = "Volume", System = "US",        IsBaseUnit = false, ToBaseMultiplier = 117.34777m, SortOrder = 10, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Fluid Ounce(s)", Abbreviation = "fl oz", UnitCategory = "Volume", System = "US",        IsBaseUnit = false, ToBaseMultiplier = 0.0295735m, SortOrder = 20, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Gallon(s)",      Abbreviation = "gal",   UnitCategory = "Volume", System = "US",        IsBaseUnit = false, ToBaseMultiplier = 3.78541m,   SortOrder = 30, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Hectoliter(s)",  Abbreviation = "hL",    UnitCategory = "Volume", System = "Metric",    IsBaseUnit = false, ToBaseMultiplier = 100m,       SortOrder = 40, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Liter(s)",       Abbreviation = "L",     UnitCategory = "Volume", System = "Metric",    IsBaseUnit = true,  ToBaseMultiplier = 1m,         SortOrder = 50, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Milliliter(s)",  Abbreviation = "mL",    UnitCategory = "Volume", System = "Metric",    IsBaseUnit = false, ToBaseMultiplier = 0.001m,     SortOrder = 60, IsActive = true, CreatedAt = now, UpdatedAt = now },
                // Weight — base: Kilogram
                new UnitOfMeasure { Name = "Gram(s)",        Abbreviation = "g",     UnitCategory = "Weight", System = "Metric",    IsBaseUnit = false, ToBaseMultiplier = 0.001m,     SortOrder = 10, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Kilogram(s)",    Abbreviation = "kg",    UnitCategory = "Weight", System = "Metric",    IsBaseUnit = true,  ToBaseMultiplier = 1m,         SortOrder = 20, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Ounce(s)",       Abbreviation = "oz",    UnitCategory = "Weight", System = "US",        IsBaseUnit = false, ToBaseMultiplier = 0.0283495m, SortOrder = 30, IsActive = true, CreatedAt = now, UpdatedAt = now },
                new UnitOfMeasure { Name = "Pound(s)",       Abbreviation = "lb",    UnitCategory = "Weight", System = "US",        IsBaseUnit = false, ToBaseMultiplier = 0.453592m,  SortOrder = 40, IsActive = true, CreatedAt = now, UpdatedAt = now },
                // Count — base: Each
                new UnitOfMeasure { Name = "Each",           Abbreviation = "ea",    UnitCategory = "Count",  System = "Universal", IsBaseUnit = true,  ToBaseMultiplier = 1m,         SortOrder = 10, IsActive = true, CreatedAt = now, UpdatedAt = now }
            );
            await db.SaveChangesAsync();
        }
    }
}
