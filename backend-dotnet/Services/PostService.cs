using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BackendDotnet.Models;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Http;

namespace BackendDotnet.Services
{
    public class PostService : IPostService
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PostService(FirestoreDb firestoreDb, IHttpContextAccessor httpContextAccessor)
        {
            _firestoreDb = firestoreDb;
            _httpContextAccessor = httpContextAccessor;
        }

        private string BaseUri =>
            $"{_httpContextAccessor.HttpContext?.Request.Scheme}://{_httpContextAccessor.HttpContext?.Request.Host}/api";

        public async Task<PagedResult<PostResponse>> GetFeedAsync(int page, int limit)
        {
            CollectionReference collection = _firestoreDb.Collection("posts");

            AggregateQuery countQuery = collection.Count();
            AggregateQuerySnapshot countSnapshot = await countQuery.GetSnapshotAsync();
            int totalItems = (int)countSnapshot.Count;

            Query query = collection.OrderByDescending("createdAt")
                                   .Limit(limit)
                                   .Offset((page - 1) * limit);

            QuerySnapshot snapshot = await query.GetSnapshotAsync();

            var posts = new List<PostResponse>();
            foreach (DocumentSnapshot doc in snapshot.Documents)
            {
                if (!doc.Exists) continue;
                posts.Add(MapToPostResponse(doc));
            }

            int totalPages = totalItems > 0 ? (int)Math.Ceiling((double)totalItems / limit) : 0;
            bool hasNext = page < totalPages;
            bool hasPrev = page > 1;

            var pagedResult = new PagedResult<PostResponse>
            {
                Data = posts,
                Page = page,
                Limit = limit,
                TotalItems = totalItems,
                TotalPages = totalPages,
                HasNext = hasNext
            };

            pagedResult.Links.Add(new LinkDto("self", $"{BaseUri}/posts?page={page}&limit={limit}", "GET"));
            if (hasNext)
                pagedResult.Links.Add(new LinkDto("next", $"{BaseUri}/posts?page={page + 1}&limit={limit}", "GET"));
            if (hasPrev)
                pagedResult.Links.Add(new LinkDto("prev", $"{BaseUri}/posts?page={page - 1}&limit={limit}", "GET"));

            return pagedResult;
        }

        public async Task<PostResponse?> GetByIdAsync(string id)
        {
            DocumentSnapshot doc = await _firestoreDb.Collection("posts").Document(id).GetSnapshotAsync();
            if (!doc.Exists) return null;
            return MapToPostResponse(doc);
        }

        public async Task<PostResponse> CreateAsync(CreatePostRequest request, string uid)
        {
            var nuevoPost = new Dictionary<string, object>
            {
                { "titulo", request.Title },
                { "descripcion", request.Description ?? "" },
                { "imagenes", new List<string> { request.ImageUrl ?? "https://picsum.photos/seed/placeholder/400/300" } },
                { "precio", request.Price },
                { "webLink", request.WebLink },
                { "autor", uid },
                { "vistas", 0 },
                { "estado", "disponible" },
                { "totalComentarios", 0 },
                { "totalLikes", 0 },
                { "createdAt", FieldValue.ServerTimestamp },
                { "updatedAt", FieldValue.ServerTimestamp }
            };

            DocumentReference docRef = await _firestoreDb.Collection("posts").AddAsync(nuevoPost);
            DocumentSnapshot doc = await docRef.GetSnapshotAsync();
            return MapToPostResponse(doc);
        }

        public async Task<PostResponse?> UpdateAsync(string id, UpdatePostRequest request, string uid)
        {
            DocumentReference docRef = _firestoreDb.Collection("posts").Document(id);
            DocumentSnapshot doc = await docRef.GetSnapshotAsync();
            if (!doc.Exists) return null;

            var data = doc.ToDictionary();
            if (data["autor"]?.ToString() != uid) return null;

            var updates = new Dictionary<string, object>();
            if (request.Title != null) updates["titulo"] = request.Title;
            if (request.Description != null) updates["descripcion"] = request.Description;
            if (request.ImageUrl != null) updates["imagenes"] = new List<string> { request.ImageUrl };
            if (request.Price.HasValue) updates["precio"] = request.Price;
            if (request.WebLink != null) updates["webLink"] = request.WebLink;
            if (request.Estado != null) updates["estado"] = request.Estado;
            updates["updatedAt"] = FieldValue.ServerTimestamp;

            await docRef.UpdateAsync(updates);
            DocumentSnapshot updatedDoc = await docRef.GetSnapshotAsync();
            return MapToPostResponse(updatedDoc);
        }

        public async Task<bool> DeleteAsync(string id, string uid)
        {
            DocumentReference docRef = _firestoreDb.Collection("posts").Document(id);
            DocumentSnapshot doc = await docRef.GetSnapshotAsync();
            if (!doc.Exists) return false;

            var data = doc.ToDictionary();
            if (data["autor"]?.ToString() != uid) return false;

            await docRef.DeleteAsync();
            return true;
        }

        private PostResponse MapToPostResponse(DocumentSnapshot doc)
        {
            var data = doc.ToDictionary();
            string id = doc.Id;
            string titulo = data.GetValueOrDefault("titulo")?.ToString() ?? "Sin título";
            string descripcion = data.GetValueOrDefault("descripcion")?.ToString() ?? "";
            string autor = data.GetValueOrDefault("autor")?.ToString() ?? "anonimo";
            string estado = data.GetValueOrDefault("estado")?.ToString() ?? "disponible";

            string? precioStr = null;
            if (data.ContainsKey("precio") && data["precio"] != null)
            {
                double precioVal = Convert.ToDouble(data["precio"]);
                precioStr = $"{precioVal}$";
            }

            int vistas = 0;
            if (data.ContainsKey("vistas") && data["vistas"] != null)
                int.TryParse(data["vistas"].ToString(), out vistas);
            string vistasStr = vistas >= 1000 ? $"{(vistas / 1000.0):F1}k" : vistas.ToString();

            int totalComentarios = 0;
            if (data.ContainsKey("totalComentarios") && data["totalComentarios"] != null)
                int.TryParse(data["totalComentarios"].ToString(), out totalComentarios);

            int totalLikes = 0;
            if (data.ContainsKey("totalLikes") && data["totalLikes"] != null)
                int.TryParse(data["totalLikes"].ToString(), out totalLikes);

            string imageUrl = "https://picsum.photos/seed/placeholder/400/300";
            int totalImages = 0;
            if (data.ContainsKey("imagenes") && data["imagenes"] is List<object> imgList)
            {
                totalImages = imgList.Count;
                if (totalImages > 0) imageUrl = imgList[0]?.ToString() ?? imageUrl;
            }

            string? webLink = data.GetValueOrDefault("webLink")?.ToString();
            if (string.IsNullOrWhiteSpace(webLink)) webLink = null;

            DateTime createdAt = data.ContainsKey("createdAt") && data["createdAt"] is Timestamp ts
                ? ts.ToDateTime() : DateTime.UtcNow;
            DateTime updatedAt = data.ContainsKey("updatedAt") && data["updatedAt"] is Timestamp us
                ? us.ToDateTime() : createdAt;

            // Denormalizar datos del autor (evita N+1 queries del lado del cliente)
            string authorProfileName = "Usuario";
            string authorUsername = "usuario";
            string? authorProfilePicture = null;
            if (!string.IsNullOrEmpty(autor) && autor != "anonimo")
            {
                try
                {
                    DocumentSnapshot userDoc = _firestoreDb.Collection("users").Document(autor).GetSnapshotAsync().GetAwaiter().GetResult();
                    if (userDoc.Exists)
                    {
                        var userData = userDoc.ToDictionary();
                        authorProfileName = userData.GetValueOrDefault("profileName")?.ToString() ?? "Usuario";
                        authorUsername = userData.GetValueOrDefault("username")?.ToString() ?? "usuario";
                        authorProfilePicture = userData.GetValueOrDefault("profilePicture")?.ToString();
                    }
                }
                catch
                {
                    // Si falla la consulta del autor, usar defaults
                }
            }

            var postResponse = new PostResponse
            {
                Id = id,
                Title = titulo,
                Image = imageUrl,
                Price = precioStr,
                Views = vistasStr,
                TotalImages = totalImages,
                Description = descripcion,
                Author = autor,
                AuthorProfileName = authorProfileName,
                AuthorUsername = authorUsername,
                AuthorProfilePicture = authorProfilePicture,
                Estado = estado,
                TotalComentarios = totalComentarios,
                TotalLikes = totalLikes,
                WebLink = webLink,
                CreatedAt = createdAt,
                UpdatedAt = updatedAt
            };

            postResponse.Links.Add(new LinkDto("self", $"{BaseUri}/posts/{id}", "GET"));
            postResponse.Links.Add(new LinkDto("comments", $"{BaseUri}/posts/{id}/comentarios", "GET"));
            postResponse.Links.Add(new LinkDto("author", $"{BaseUri}/usuarios/{autor}", "GET"));
            postResponse.Links.Add(new LinkDto("like", $"{BaseUri}/posts/{id}/likes", "POST"));
            postResponse.Links.Add(new LinkDto("delete", $"{BaseUri}/posts/{id}", "DELETE"));

            return postResponse;
        }
    }
}
