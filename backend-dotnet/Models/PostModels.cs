using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BackendDotnet.Models
{
    public class LinkDto
    {
        public string Rel { get; set; } = string.Empty;
        public string Href { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;

        public LinkDto() { }

        public LinkDto(string rel, string href, string method)
        {
            Rel = rel;
            Href = href;
            Method = method;
        }
    }

    public class PostResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public string? Price { get; set; }
        public string Views { get; set; } = "0";
        public int TotalImages { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string AuthorProfileName { get; set; } = string.Empty;
        public string AuthorUsername { get; set; } = string.Empty;
        public string? AuthorProfilePicture { get; set; }
        public string Estado { get; set; } = "disponible";
        public int TotalComentarios { get; set; }
        public int TotalLikes { get; set; }
        public string? WebLink { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<LinkDto> Links { get; set; } = new();
    }

    public class PagedResult<T>
    {
        public IEnumerable<T> Data { get; set; } = new List<T>();
        public int Page { get; set; }
        public int Limit { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
        public bool HasNext { get; set; }
        public List<LinkDto> Links { get; set; } = new();
    }

    public class CreatePostRequest
    {
        [Required(ErrorMessage = "El título es obligatorio")]
        [StringLength(80, MinimumLength = 3, ErrorMessage = "El título debe tener entre 3 y 80 caracteres")]
        public string Title { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres")]
        public string? Description { get; set; }

        [Range(0, 999999999, ErrorMessage = "El precio debe ser un valor positivo")]
        public double? Price { get; set; }

        public string? ImageUrl { get; set; }

        public string? WebLink { get; set; }
    }

    public class UpdatePostRequest
    {
        [StringLength(80, MinimumLength = 3, ErrorMessage = "El título debe tener entre 3 y 80 caracteres")]
        public string? Title { get; set; }

        [StringLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres")]
        public string? Description { get; set; }

        [Range(0, 999999999, ErrorMessage = "El precio debe ser un valor positivo")]
        public double? Price { get; set; }

        public string? ImageUrl { get; set; }

        public string? WebLink { get; set; }

        [RegularExpression("^(disponible|vendido|reservado)$", ErrorMessage = "Estado debe ser: disponible, vendido o reservado")]
        public string? Estado { get; set; }
    }
}
