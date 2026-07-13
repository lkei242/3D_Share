using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using BackendDotnet.Models;
using BackendDotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackendDotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly IPostService _postService;

        public PostsController(IPostService postService)
        {
            _postService = postService;
        }

        [HttpGet]
        public async Task<IActionResult> GetFeed([FromQuery] int page = 1, [FromQuery] int limit = 10)
        {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 50) limit = 10;

            var result = await _postService.GetFeedAsync(page, limit);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var post = await _postService.GetByIdAsync(id);
            if (post == null)
                return NotFound(new { error = "Publicación no encontrada." });
            return Ok(post);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("user_id")?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
                return Unauthorized(new { error = "No se pudo identificar al usuario autenticado." });

            try
            {
                var post = await _postService.CreateAsync(request, uid);
                return CreatedAtAction(nameof(GetById), new { id = post.Id }, post);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error al crear la publicación.", detail = ex.Message });
            }
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePost(string id, [FromBody] UpdatePostRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("user_id")?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
                return Unauthorized(new { error = "No se pudo identificar al usuario autenticado." });

            var post = await _postService.UpdateAsync(id, request, uid);
            if (post == null)
                return NotFound(new { error = "Publicación no encontrada o no tienes permiso para editarla." });

            return Ok(post);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePost(string id)
        {
            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("user_id")?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
                return Unauthorized(new { error = "No se pudo identificar al usuario autenticado." });

            var deleted = await _postService.DeleteAsync(id, uid);
            if (!deleted)
                return NotFound(new { error = "Publicación no encontrada o no tienes permiso para eliminarla." });

            return NoContent();
        }
    }
}
