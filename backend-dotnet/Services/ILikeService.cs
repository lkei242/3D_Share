using System.Threading.Tasks;
using BackendDotnet.Models;

namespace BackendDotnet.Services
{
    public interface ILikeService
    {
        Task<LikeToggleResponse> ToggleAsync(string postId, string uid);
        Task<int> GetCountByPostAsync(string postId);
    }
}
