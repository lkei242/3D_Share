using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BackendDotnet.Models;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Http;

namespace BackendDotnet.Services
{
    public class CommentService : ICommentService
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CommentService(FirestoreDb firestoreDb, IHttpContextAccessor httpContextAccessor)
        {
            _firestoreDb = firestoreDb;
            _httpContextAccessor = httpContextAccessor;
        }

        private string BaseUri =>
            $"{_httpContextAccessor.HttpContext?.Request.Scheme}://{_httpContextAccessor.HttpContext?.Request.Host}/api";

        public async Task<PagedResult<CommentResponse>> GetByPostAsync(string postId, int page, int limit)
        {
            CollectionReference collection = _firestoreDb.Collection("comments");

            Query countQuery = collection.WhereEqualTo("postId", postId);
            AggregateQuery aggregate = countQuery.Count();
            AggregateQuerySnapshot countSnapshot = await aggregate.GetSnapshotAsync();
            int totalItems = (int)countSnapshot.Count;

            Query query = collection.WhereEqualTo("postId", postId)
                                   .OrderByDescending("createdAt")
                                   .Limit(limit)
                                   .Offset((page - 1) * limit);

            QuerySnapshot snapshot = await query.GetSnapshotAsync();

            var comments = new List<CommentResponse>();
            foreach (DocumentSnapshot doc in snapshot.Documents)
            {
                if (!doc.Exists) continue;
                comments.Add(await MapToCommentResponse(doc));
            }

            int totalPages = totalItems > 0 ? (int)Math.Ceiling((double)totalItems / limit) : 0;
            bool hasNext = page < totalPages;
            bool hasPrev = page > 1;

            var pagedResult = new PagedResult<CommentResponse>
            {
                Data = comments,
                Page = page,
                Limit = limit,
                TotalItems = totalItems,
                TotalPages = totalPages,
                HasNext = hasNext
            };

            pagedResult.Links.Add(new LinkDto("self", $"{BaseUri}/posts/{postId}/comentarios?page={page}&limit={limit}", "GET"));
            if (hasNext)
                pagedResult.Links.Add(new LinkDto("next", $"{BaseUri}/posts/{postId}/comentarios?page={page + 1}&limit={limit}", "GET"));
            if (hasPrev)
                pagedResult.Links.Add(new LinkDto("prev", $"{BaseUri}/posts/{postId}/comentarios?page={page - 1}&limit={limit}", "GET"));

            return pagedResult;
        }

        public async Task<CommentResponse> CreateAsync(CreateCommentRequest request, string uid)
        {
            var nuevoComentario = new Dictionary<string, object>
            {
                { "postId", request.PostId },
                { "authorId", uid },
                { "content", request.Content },
                { "createdAt", FieldValue.ServerTimestamp }
            };

            DocumentReference docRef = await _firestoreDb.Collection("comments").AddAsync(nuevoComentario);

            var postRef = _firestoreDb.Collection("posts").Document(request.PostId);
            await postRef.UpdateAsync("totalComentarios", FieldValue.Increment(1));

            DocumentSnapshot doc = await docRef.GetSnapshotAsync();
            return await MapToCommentResponse(doc);
        }

        public async Task<bool> DeleteAsync(string id, string uid)
        {
            DocumentReference docRef = _firestoreDb.Collection("comments").Document(id);
            DocumentSnapshot doc = await docRef.GetSnapshotAsync();
            if (!doc.Exists) return false;

            var data = doc.ToDictionary();
            if (data["authorId"]?.ToString() != uid) return false;

            string postId = data["postId"]?.ToString() ?? "";
            await docRef.DeleteAsync();

            if (!string.IsNullOrEmpty(postId))
            {
                var postRef = _firestoreDb.Collection("posts").Document(postId);
                await postRef.UpdateAsync("totalComentarios", FieldValue.Increment(-1));
            }

            return true;
        }

        private async Task<CommentResponse> MapToCommentResponse(DocumentSnapshot doc)
        {
            var data = doc.ToDictionary();
            string id = doc.Id;
            string authorId = data.GetValueOrDefault("authorId")?.ToString() ?? "";

            string authorName = "Usuario";
            string? authorPicture = null;
            if (!string.IsNullOrEmpty(authorId))
            {
                DocumentSnapshot userDoc = await _firestoreDb.Collection("users").Document(authorId).GetSnapshotAsync();
                if (userDoc.Exists)
                {
                    var userData = userDoc.ToDictionary();
                    authorName = userData.GetValueOrDefault("profileName")?.ToString() ?? "Usuario";
                    authorPicture = userData.GetValueOrDefault("profilePicture")?.ToString();
                }
            }

            DateTime createdAt = data.ContainsKey("createdAt") && data["createdAt"] is Timestamp ts
                ? ts.ToDateTime() : DateTime.UtcNow;

            var response = new CommentResponse
            {
                Id = id,
                PostId = data.GetValueOrDefault("postId")?.ToString() ?? "",
                AuthorId = authorId,
                AuthorName = authorName,
                AuthorPicture = authorPicture,
                Content = data.GetValueOrDefault("content")?.ToString() ?? "",
                CreatedAt = createdAt
            };

            response.Links.Add(new LinkDto("self", $"{BaseUri}/comentarios/{id}", "GET"));
            response.Links.Add(new LinkDto("delete", $"{BaseUri}/comentarios/{id}", "DELETE"));

            return response;
        }
    }
}
