using System.Collections.Generic;

namespace BackendDotnet.Models
{
    public class LinkDto
    {
        public string Rel { get; set; }
        public string Href { get; set; }
        public string Method { get; set; }

        public LinkDto(string rel, string href, string method)
        {
            Rel = rel;
            Href = href;
            Method = method;
        }
    }

    public class PostResponse
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Image { get; set; }
        public string Price { get; set; }
        public string Views { get; set; }
        public int TotalImages { get; set; }
        public string Description { get; set; }
        public string Author { get; set; }
        public string Estado { get; set; }
        public int TotalComentarios { get; set; }
        public int TotalLikes { get; set; }
        public List<LinkDto> Links { get; set; } = new List<LinkDto>();
    }

    public class PagedResult<T>
    {
        public IEnumerable<T> Data { get; set; }
        public int Page { get; set; }
        public int Limit { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
        public bool HasNext { get; set; }
        public List<LinkDto> Links { get; set; } = new List<LinkDto>();
    }

    public class CreatePostRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public double? Price { get; set; }
        public string ImageUrl { get; set; }
    }
}
