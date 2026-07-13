using System.Security.Claims;
using System.Threading.Tasks;
using BackendDotnet.Models;
using BackendDotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackendDotnet.Controllers
{
    [ApiController]
    [Route("api/posts/{postId}/[controller]")]
    public class CommentsController : ControllerBase
    {
        private readonly ICommentService _commentService;

        public CommentsController(ICommentService commentService)
        {
            _commentService = commentService;
        }

        [HttpGet]
        public async Task<IActionResult> GetByPost(string postId, [FromQuery] int page = 1, [FromQuery] int limit = 10)
        {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 50) limit = 10;

            var result = await _commentService.GetByPostAsync(postId, page, limit);
            return Ok(result);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateComment(string postId, [FromBody] CreateCommentRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            request.PostId = postId;

            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("user_id")?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
                return Unauthorized(new { error = "No se pudo identificar al usuario autenticado." });

            var comment = await _commentService.CreateAsync(request, uid);
            return CreatedAtAction(nameof(GetByPost), new { postId }, comment);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("user_id")?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
                return Unauthorized(new { error = "No se pudo identificar al usuario autenticado." });

            var deleted = await _commentService.DeleteAsync(id, uid);
            if (!deleted)
                return NotFound(new { error = "Comentario no encontrado o no tienes permiso para eliminarlo." });

            return NoContent();
        }
    }
}
