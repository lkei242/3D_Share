using System.Threading.Tasks;
using BackendDotnet.Models;

namespace BackendDotnet.Services
{
    public interface IPostService
    {
        Task<PagedResult<PostResponse>> GetFeedAsync(int page, int limit);
        Task<PostResponse?> GetByIdAsync(string id);
        Task<PostResponse> CreateAsync(CreatePostRequest request, string uid);
        Task<PostResponse?> UpdateAsync(string id, UpdatePostRequest request, string uid);
        Task<bool> DeleteAsync(string id, string uid);
    }
}
