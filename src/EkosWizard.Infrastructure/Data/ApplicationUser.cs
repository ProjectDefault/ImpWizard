using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace ImpWizard.Infrastructure.Data;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    [MaxLength(100)] public string? Title { get; set; }
    [MaxLength(100)] public string? Organization { get; set; }
    [MaxLength(50)]  public string? TimeZoneId { get; set; }  // IANA e.g. "America/New_York"
}
