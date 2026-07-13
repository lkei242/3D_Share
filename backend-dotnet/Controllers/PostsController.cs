using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using BackendDotnet.Models;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackendDotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        // Datos de demostración estáticos (Mock) en memoria como fallback ante credenciales inválidas/expiradas
        private static readonly List<PostResponse> MockPosts = new List<PostResponse>
        {
            new PostResponse { Id = "m1", Title = "Soporte auriculares PLA", Image = "https://picsum.photos/seed/a1/400/300", Price = "5000$", Views = "1.2k", TotalImages = 1, Description = "Soporte premium para auriculares impreso en PLA color negro.", Author = "mock_author_1", Estado = "disponible", TotalComentarios = 5, TotalLikes = 12 },
            new PostResponse { Id = "m2", Title = "Figura de dragón articulada", Image = "https://picsum.photos/seed/a2/400/300", Price = null, Views = "890", TotalImages = 3, Description = "Increíble figura coleccionable articulada impresa en resina de alta definición.", Author = "mock_author_2", Estado = "disponible", TotalComentarios = 3, TotalLikes = 8 },
            new PostResponse { Id = "m3", Title = "Maqueta Estadio Boca Juniors", Image = "https://picsum.photos/seed/a3/400/300", Price = "12000$", Views = "4.5k", TotalImages = 2, Description = "Maqueta detallada del estadio Alberto J. Armando (La Bombonera).", Author = "mock_author_3", Estado = "disponible", TotalComentarios = 15, TotalLikes = 142 },
            new PostResponse { Id = "m4", Title = "Maceta geométrica minimalista", Image = "https://picsum.photos/seed/a4/400/300", Price = "1500$", Views = "310", TotalImages = 1, Description = "Maceta de diseño nórdico para plantas de interior.", Author = "mock_author_1", Estado = "disponible", TotalComentarios = 1, TotalLikes = 4 },
            new PostResponse { Id = "m5", Title = "Llavero logo Batman", Image = "https://picsum.photos/seed/a5/400/300", Price = "500$", Views = "2.1k", TotalImages = 1, Description = "Llavero clásico impreso en filamento PLA fluorescente.", Author = "mock_author_4", Estado = "disponible", TotalComentarios = 0, TotalLikes = 25 },
            new PostResponse { Id = "m6", Title = "Organizador de escritorio modular", Image = "https://picsum.photos/seed/a6/400/300", Price = "3500$", Views = "650", TotalImages = 4, Description = "Set modular de organizador con portalápices y tarjetero.", Author = "mock_author_2", Estado = "disponible", TotalComentarios = 4, TotalLikes = 19 },
            new PostResponse { Id = "m7", Title = "Mate autocebante impreso", Image = "https://picsum.photos/seed/a7/400/300", Price = "2800$", Views = "1.8k", TotalImages = 1, Description = "Mate térmico con bombilla de acero inoxidable incluida.", Author = "mock_author_3", Estado = "disponible", TotalComentarios = 8, TotalLikes = 44 },
            new PostResponse { Id = "m8", Title = "Cortador de galletas navideñas", Image = "https://picsum.photos/seed/a8/400/300", Price = "800$", Views = "120", TotalImages = 6, Description = "Pack de 6 moldes navideños aptos para uso gastronómico.", Author = "mock_author_4", Estado = "disponible", TotalComentarios = 2, TotalLikes = 3 },
            new PostResponse { Id = "m9", Title = "Soporte celular de mesa", Image = "https://picsum.photos/seed/a9/400/300", Price = "1000$", Views = "980", TotalImages = 1, Description = "Soporte universal regulable en inclinación.", Author = "mock_author_1", Estado = "disponible", TotalComentarios = 1, TotalLikes = 11 },
            new PostResponse { Id = "m10", Title = "Lámpara de noche Luna 3D", Image = "https://picsum.photos/seed/a10/400/300", Price = "8500$", Views = "3.2k", TotalImages = 2, Description = "Lámpara con textura realista y luz LED multicolor de bajo consumo.", Author = "mock_author_2", Estado = "disponible", TotalComentarios = 11, TotalLikes = 89 }
        };

        public PostsController(FirestoreDb firestoreDb = null)
        {
            _firestoreDb = firestoreDb;
        }

        // ==========================================
        // 1. GET /api/posts - [PAGINADO] & [LINK]
        // ==========================================
        [HttpGet]
        public async Task<IActionResult> GetFeed([FromQuery] int page = 1, [FromQuery] int limit = 10)
        {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 50) limit = 10;

            try
            {
                if (_firestoreDb == null)
                {
                    throw new Exception("El cliente de Firestore no está configurado.");
                }

                CollectionReference collection = _firestoreDb.Collection("posts");

                // 1. Obtener la cantidad total de elementos
                AggregateQuery countQuery = collection.Count();
                AggregateQuerySnapshot countSnapshot = await countQuery.GetSnapshotAsync();
                int totalItems = (int)countSnapshot.Count;

                // Si no hay posts en la base de datos, usamos los mocks para no devolver vacío
                if (totalItems == 0)
                {
                    Console.WriteLine("ℹ️ Firestore vacío. Devolviendo datos en memoria (Mocks) como demostración.");
                    return GetMockFeed(page, limit);
                }

                // 2. Consulta paginada
                Query query = collection.OrderByDescending("createdAt")
                                       .Limit(limit)
                                       .Offset((page - 1) * limit);

                QuerySnapshot snapshot = await query.GetSnapshotAsync();

                var posts = new List<PostResponse>();
                foreach (DocumentSnapshot doc in snapshot.Documents)
                {
                    if (doc.Exists)
                    {
                        var data = doc.ToDictionary();
                        string id = doc.Id;
                        string titulo = data.ContainsKey("titulo") ? data["titulo"]?.ToString() : "Sin título";
                        string descripcion = data.ContainsKey("descripcion") ? data["descripcion"]?.ToString() : "";
                        string autor = data.ContainsKey("autor") ? data["autor"]?.ToString() : "anonimo";
                        string estado = data.ContainsKey("estado") ? data["estado"]?.ToString() : "disponible";
                        
                        string precioStr = null;
                        if (data.ContainsKey("precio") && data["precio"] != null)
                        {
                            precioStr = $"{data["precio"]}$";
                        }

                        int vistas = 0;
                        if (data.ContainsKey("vistas") && data["vistas"] != null)
                        {
                            int.TryParse(data["vistas"].ToString(), out vistas);
                        }
                        string vistasStr = vistas >= 1000 ? $"{(vistas / 1000.0):F1}k" : vistas.ToString();

                        int totalComentarios = 0;
                        if (data.ContainsKey("totalComentarios") && data["totalComentarios"] != null)
                        {
                            int.TryParse(data["totalComentarios"].ToString(), out totalComentarios);
                        }

                        int totalLikes = 0;
                        if (data.ContainsKey("totalLikes") && data["totalLikes"] != null)
                        {
                            int.TryParse(data["totalLikes"].ToString(), out totalLikes);
                        }

                        string imageUrl = "https://picsum.photos/seed/placeholder/400/300";
                        int totalImages = 0;
                        if (data.ContainsKey("imagenes") && data["imagenes"] is List<object> imgList)
                        {
                            totalImages = imgList.Count;
                            if (totalImages > 0)
                            {
                                imageUrl = imgList[0]?.ToString();
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
                            Estado = estado,
                            TotalComentarios = totalComentarios,
                            TotalLikes = totalLikes
                        };

                        // [LINK] - Hipervínculos HATEOAS a nivel de recurso
                        string baseUri = $"{Request.Scheme}://{Request.Host}/api";
                        postResponse.Links.Add(new LinkDto("self", $"{baseUri}/posts/{id}", "GET"));
                        postResponse.Links.Add(new LinkDto("comments", $"{baseUri}/posts/{id}/comentarios", "GET"));
                        postResponse.Links.Add(new LinkDto("author", $"{baseUri}/usuarios/{autor}", "GET"));
                        postResponse.Links.Add(new LinkDto("like", $"{baseUri}/posts/{id}/likes", "POST"));

                        posts.Add(postResponse);
                    }
                }

                int totalPages = (int)Math.Ceiling((double)totalItems / limit);
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

                // [LINK] - Hipervínculos HATEOAS a nivel de paginación
                string pageUri = $"{Request.Scheme}://{Request.Host}/api/posts";
                pagedResult.Links.Add(new LinkDto("self", $"{pageUri}?page={page}&limit={limit}", "GET"));
                if (hasNext)
                {
                    pagedResult.Links.Add(new LinkDto("next", $"{pageUri}?page={page + 1}&limit={limit}", "GET"));
                }
                if (hasPrev)
                {
                    pagedResult.Links.Add(new LinkDto("prev", $"{pageUri}?page={page - 1}&limit={limit}", "GET"));
                }

                return Ok(pagedResult);
            }
            catch (Exception ex)
            {
                // FALLBACK AUTOMÁTICO: Si hay error de conexión/credenciales (invalid_grant), devolvemos datos en memoria
                Console.WriteLine($"⚠️ ADVERTENCIA: Error al conectar con Firestore ({ex.Message}). Usando datos de demostración en memoria (Mocks).");
                return GetMockFeed(page, limit);
            }
        }

        // ==========================================
        // 2. POST /api/posts - [AUTENTICADO]
        // ==========================================
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { error = "El título de la publicación es obligatorio." });
            }

            // Obtener el ID de usuario autenticado
            string uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                         ?? User.FindFirst("user_id")?.Value 
                         ?? User.FindFirst("sub")?.Value 
                         ?? "usuario_prueba_dotnet";

            try
            {
                if (_firestoreDb == null)
                {
                    throw new Exception("El cliente de Firestore no está configurado.");
                }

                // Crear objeto de documento de Firestore
                var nuevoPost = new Dictionary<string, object>
                {
                    { "titulo", request.Title },
                    { "descripcion", request.Description ?? "" },
                    { "imagenes", new List<string> { request.ImageUrl ?? "https://picsum.photos/seed/placeholder/400/300" } },
                    { "precio", request.Price },
                    { "autor", uid },
                    { "vistas", 0 },
                    { "estado", "disponible" },
                    { "totalComentarios", 0 },
                    { "totalLikes", 0 },
                    { "createdAt", FieldValue.ServerTimestamp }
                };

                // Guardar en Firestore
                DocumentReference docRef = await _firestoreDb.Collection("posts").AddAsync(nuevoPost);

                var postResponse = BuildPostResponse(docRef.Id, request.Title, request.Description, request.Price, request.ImageUrl, uid);
                return CreatedAtAction(nameof(GetFeed), new { id = docRef.Id }, postResponse);
            }
            catch (Exception ex)
            {
                // FALLBACK AUTOMÁTICO: Guardar en memoria simulada si Firestore falla
                Console.WriteLine($"⚠️ ADVERTENCIA: Error al guardar en Firestore ({ex.Message}). Guardando temporalmente en memoria local (Mock).");
                
                string newId = $"m_created_{Guid.NewGuid().ToString().Substring(0, 8)}";
                var mockCreatedPost = BuildPostResponse(newId, request.Title, request.Description, request.Price, request.ImageUrl, uid);
                
                // Agregar al inicio de los mocks para verlo en los GET inmediatos
                MockPosts.Insert(0, mockCreatedPost);

                return CreatedAtAction(nameof(GetFeed), new { id = newId }, mockCreatedPost);
            }
        }

        // ==========================================
        // MÉTODOS AUXILIARES PARA EL MODO DEMOSTRACIÓN (MOCK)
        // ==========================================
        private IActionResult GetMockFeed(int page, int limit)
        {
            int totalItems = MockPosts.Count;
            var pagedData = MockPosts.Skip((page - 1) * limit).Take(limit).ToList();

            // Asignar links HATEOAS relacionales a los mocks individuales
            string baseUri = $"{Request.Scheme}://{Request.Host}/api";
            foreach (var post in pagedData)
            {
                post.Links = new List<LinkDto>
                {
                    new LinkDto("self", $"{baseUri}/posts/{post.Id}", "GET"),
                    new LinkDto("comments", $"{baseUri}/posts/{post.Id}/comentarios", "GET"),
                    new LinkDto("author", $"{baseUri}/usuarios/{post.Author}", "GET"),
                    new LinkDto("like", $"{baseUri}/posts/{post.Id}/likes", "POST")
                };
            }

            int totalPages = (int)Math.Ceiling((double)totalItems / limit);
            bool hasNext = page < totalPages;
            bool hasPrev = page > 1;

            var pagedResult = new PagedResult<PostResponse>
            {
                Data = pagedData,
                Page = page,
                Limit = limit,
                TotalItems = totalItems,
                TotalPages = totalPages,
                HasNext = hasNext
            };

            // Enlaces HATEOAS a nivel de paginación
            string pageUri = $"{Request.Scheme}://{Request.Host}/api/posts";
            pagedResult.Links.Add(new LinkDto("self", $"{pageUri}?page={page}&limit={limit}", "GET"));
            if (hasNext)
            {
                pagedResult.Links.Add(new LinkDto("next", $"{pageUri}?page={page + 1}&limit={limit}", "GET"));
            }
            if (hasPrev)
            {
                pagedResult.Links.Add(new LinkDto("prev", $"{pageUri}?page={page - 1}&limit={limit}", "GET"));
            }

            return Ok(pagedResult);
        }

        private PostResponse BuildPostResponse(string id, string title, string description, double? price, string imageUrl, string uid)
        {
            var postResponse = new PostResponse
            {
                Id = id,
                Title = title,
                Image = imageUrl ?? "https://picsum.photos/seed/placeholder/400/300",
                Price = price.HasValue ? $"{price}$" : null,
                Views = "0",
                TotalImages = 1,
                Description = description ?? "",
                Author = uid,
                Estado = "disponible",
                TotalComentarios = 0,
                TotalLikes = 0
            };

            string baseUri = $"{Request.Scheme}://{Request.Host}/api";
            postResponse.Links.Add(new LinkDto("self", $"{baseUri}/posts/{id}", "GET"));
            postResponse.Links.Add(new LinkDto("comments", $"{baseUri}/posts/{id}/comentarios", "GET"));
            postResponse.Links.Add(new LinkDto("author", $"{baseUri}/usuarios/{uid}", "GET"));
            postResponse.Links.Add(new LinkDto("delete", $"{baseUri}/posts/{id}", "DELETE"));

            return postResponse;
        }
    }
}
