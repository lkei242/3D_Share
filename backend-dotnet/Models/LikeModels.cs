using System;
using System.Collections.Generic;

namespace BackendDotnet.Models
{
    public class LikeResponse
    {
        public string Id { get; set; } = string.Empty;
        public string PostId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<LinkDto> Links { get; set; } = new();
    }

    public class LikeToggleResponse
    {
        public bool Liked { get; set; }
        public int TotalLikes { get; set; }
        public List<LinkDto> Links { get; set; } = new();
    }
}
