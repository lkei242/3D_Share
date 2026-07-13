using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BackendDotnet.Models
{
    public class CommentResponse
    {
        public string Id { get; set; } = string.Empty;
        public string PostId { get; set; } = string.Empty;
        public string AuthorId { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string? AuthorPicture { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<LinkDto> Links { get; set; } = new();
    }

    public class CreateCommentRequest
    {
        [Required(ErrorMessage = "El ID del post es obligatorio")]
        public string PostId { get; set; } = string.Empty;

        [Required(ErrorMessage = "El contenido es obligatorio")]
        [StringLength(1000, MinimumLength = 1, ErrorMessage = "El comentario debe tener entre 1 y 1000 caracteres")]
        public string Content { get; set; } = string.Empty;
    }
}
