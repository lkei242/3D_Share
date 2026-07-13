using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BackendDotnet.Models
{
    public class UserResponse
    {
        public string Id { get; set; } = string.Empty;
        public string ProfileName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? ProfilePicture { get; set; }
        public string? Presentation { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int TotalPosts { get; set; }
        public int TotalFollowers { get; set; }
        public int TotalFollowing { get; set; }
        public List<LinkDto> Links { get; set; } = new();
    }

    public class UpdateUserRequest
    {
        [StringLength(50, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 50 caracteres")]
        public string? ProfileName { get; set; }

        [StringLength(500, ErrorMessage = "La presentación no puede superar los 500 caracteres")]
        public string? Presentation { get; set; }

        public string? ProfilePicture { get; set; }
    }
}
