using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BackendDotnet.Models;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Http;

namespace BackendDotnet.Services
{
    public class LikeService : ILikeService
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LikeService(FirestoreDb firestoreDb, IHttpContextAccessor httpContextAccessor)
        {
            _firestoreDb = firestoreDb;
            _httpContextAccessor = httpContextAccessor;
        }

        private string BaseUri =>
            $"{_httpContextAccessor.HttpContext?.Request.Scheme}://{_httpContextAccessor.HttpContext?.Request.Host}/api";

        public async Task<LikeToggleResponse> ToggleAsync(string postId, string uid)
        {
            string likeId = $"{uid}_{postId}";
            DocumentReference likeRef = _firestoreDb.Collection("likes").Document(likeId);
            DocumentReference postRef = _firestoreDb.Collection("posts").Document(postId);

            DocumentSnapshot snap = await likeRef.GetSnapshotAsync();
            bool liked = snap.Exists;

            if (liked)
            {
                await likeRef.DeleteAsync();
                await postRef.UpdateAsync("totalLikes", FieldValue.Increment(-1));
                liked = false;
            }
            else
            {
                await likeRef.SetAsync(new Dictionary<string, object>
                {
                    { "userId", uid },
                    { "postId", postId },
                    { "createdAt", FieldValue.ServerTimestamp }
                });
                await postRef.UpdateAsync("totalLikes", FieldValue.Increment(1));
                liked = true;
            }

            DocumentSnapshot postSnap = await postRef.GetSnapshotAsync();
            int totalLikes = 0;
            if (postSnap.Exists)
            {
                var postData = postSnap.ToDictionary();
                if (postData.ContainsKey("totalLikes") && postData["totalLikes"] != null)
                    int.TryParse(postData["totalLikes"].ToString(), out totalLikes);
            }

            var response = new LikeToggleResponse
            {
                Liked = liked,
                TotalLikes = totalLikes
            };

            response.Links.Add(new LinkDto("self", $"{BaseUri}/posts/{postId}/likes", "POST"));
            response.Links.Add(new LinkDto("post", $"{BaseUri}/posts/{postId}", "GET"));

            return response;
        }

        public async Task<int> GetCountByPostAsync(string postId)
        {
            Query query = _firestoreDb.Collection("likes").WhereEqualTo("postId", postId);
            AggregateQuery aggregate = query.Count();
            AggregateQuerySnapshot snap = await aggregate.GetSnapshotAsync();
            return (int)snap.Count;
        }
    }
}
