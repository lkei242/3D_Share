using System.Security.Claims;
using System.Threading.Tasks;
using BackendDotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackendDotnet.Controllers
{
    [ApiController]
    [Route("api/posts/{postId}/[controller]")]
    public class LikesController : ControllerBase
    {
        private readonly ILikeService _likeService;

        public LikesController(ILikeService likeService)
        {
            _likeService = likeService;
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> ToggleLike(string postId)
        {
            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("user_id")?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
                return Unauthorized(new { error = "No se pudo identificar al usuario autenticado." });

            var result = await _likeService.ToggleAsync(postId, uid);
            return Ok(result);
        }

        [HttpGet("count")]
        public async Task<IActionResult> GetCount(string postId)
        {
            int count = await _likeService.GetCountByPostAsync(postId);
            return Ok(new { postId, totalLikes = count });
        }
    }
}
