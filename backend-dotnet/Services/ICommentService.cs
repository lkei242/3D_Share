using System.Threading.Tasks;
using BackendDotnet.Models;

namespace BackendDotnet.Services
{
    public interface ICommentService
    {
        Task<PagedResult<CommentResponse>> GetByPostAsync(string postId, int page, int limit);
        Task<CommentResponse> CreateAsync(CreateCommentRequest request, string uid);
        Task<bool> DeleteAsync(string id, string uid);
    }
}
