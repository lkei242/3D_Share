using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BackendDotnet.Models;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Http;

namespace BackendDotnet.Services
{
    public class UserService : IUserService
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserService(FirestoreDb firestoreDb, IHttpContextAccessor httpContextAccessor)
        {
            _firestoreDb = firestoreDb;
            _httpContextAccessor = httpContextAccessor;
        }

        private string BaseUri =>
            $"{_httpContextAccessor.HttpContext?.Request.Scheme}://{_httpContextAccessor.HttpContext?.Request.Host}/api";

        public async Task<UserResponse?> GetByIdAsync(string id)
        {
            DocumentSnapshot doc = await _firestoreDb.Collection("users").Document(id).GetSnapshotAsync();
            if (!doc.Exists) return null;

            return await MapToUserResponse(doc);
        }

        public async Task<UserResponse?> UpdateAsync(string id, UpdateUserRequest request, string uid)
        {
            if (id != uid) return null;

            DocumentReference docRef = _firestoreDb.Collection("users").Document(id);
            DocumentSnapshot doc = await docRef.GetSnapshotAsync();
            if (!doc.Exists) return null;

            var updates = new Dictionary<string, object>();
            if (request.ProfileName != null) updates["profileName"] = request.ProfileName;
            if (request.Presentation != null) updates["presentation"] = request.Presentation;
            if (request.ProfilePicture != null) updates["profilePicture"] = request.ProfilePicture;
            updates["updatedAt"] = FieldValue.ServerTimestamp;

            await docRef.UpdateAsync(updates);
            DocumentSnapshot updatedDoc = await docRef.GetSnapshotAsync();
            return await MapToUserResponse(updatedDoc);
        }

        private async Task<UserResponse> MapToUserResponse(DocumentSnapshot doc)
        {
            var data = doc.ToDictionary();
            string id = doc.Id;

            int totalPosts = 0;
            QuerySnapshot postsSnap = await _firestoreDb.Collection("posts")
                .WhereEqualTo("autor", id).GetSnapshotAsync();
            totalPosts = postsSnap.Documents.Count;

            int totalFollowers = 0;
            QuerySnapshot followersSnap = await _firestoreDb.Collection("followers")
                .WhereEqualTo("userId", id).GetSnapshotAsync();
            totalFollowers = followersSnap.Documents.Count;

            int totalFollowing = 0;
            QuerySnapshot followingSnap = await _firestoreDb.Collection("followers")
                .WhereEqualTo("followerId", id).GetSnapshotAsync();
            totalFollowing = followingSnap.Count;

            DateTime createdAt = data.ContainsKey("createdAt") && data["createdAt"] is Timestamp ts
                ? ts.ToDateTime() : DateTime.UtcNow;
            DateTime updatedAt = data.ContainsKey("updatedAt") && data["updatedAt"] is Timestamp us
                ? us.ToDateTime() : createdAt;

            var response = new UserResponse
            {
                Id = id,
                ProfileName = data.GetValueOrDefault("profileName")?.ToString() ?? "Usuario",
                Username = data.GetValueOrDefault("username")?.ToString() ?? "usuario",
                Email = data.GetValueOrDefault("email")?.ToString(),
                ProfilePicture = data.GetValueOrDefault("profilePicture")?.ToString(),
                Presentation = data.GetValueOrDefault("presentation")?.ToString(),
                CreatedAt = createdAt,
                UpdatedAt = updatedAt,
                TotalPosts = totalPosts,
                TotalFollowers = totalFollowers,
                TotalFollowing = totalFollowing
            };

            response.Links.Add(new LinkDto("self", $"{BaseUri}/usuarios/{id}", "GET"));
            response.Links.Add(new LinkDto("posts", $"{BaseUri}/usuarios/{id}/posts", "GET"));
            response.Links.Add(new LinkDto("update", $"{BaseUri}/usuarios/{id}", "PATCH"));

            return response;
        }
    }
}
