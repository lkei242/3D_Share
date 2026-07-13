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
    public class UsuariosController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsuariosController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { error = "Usuario no encontrado." });
            return Ok(user);
        }

        [Authorize]
        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("user_id")?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(uid))
                return Unauthorized(new { error = "No se pudo identificar al usuario autenticado." });

            var user = await _userService.UpdateAsync(id, request, uid);
            if (user == null)
                return NotFound(new { error = "Usuario no encontrado o no tienes permiso para editarlo." });

            return Ok(user);
        }
    }
}
