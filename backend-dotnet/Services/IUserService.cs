using System.Threading.Tasks;
using BackendDotnet.Models;

namespace BackendDotnet.Services
{
    public interface IUserService
    {
        Task<UserResponse?> GetByIdAsync(string id);
        Task<UserResponse?> UpdateAsync(string id, UpdateUserRequest request, string uid);
    }
}
