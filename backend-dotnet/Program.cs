using System;
using System.IO;
using System.Threading.Tasks;
using BackendDotnet.Middleware;
using BackendDotnet.Services;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

const string firebaseProjectId = "dshare-6b84f";

// 1. Controladores + OpenAPI
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.SuppressModelStateInvalidFilter = false;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// 2. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 3. HttpContextAccessor (para construir URIs en servicios)
builder.Services.AddHttpContextAccessor();

// 4. JWT Bearer con Firebase
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{firebaseProjectId}",
            ValidateAudience = true,
            ValidAudience = firebaseProjectId,
            ValidateLifetime = true
        };
    });

// 5. Firebase Admin SDK + FirestoreDb
string credentialsPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "firebase-service-account.json");
if (!File.Exists(credentialsPath))
{
    credentialsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "firebase-service-account.json");
}

if (File.Exists(credentialsPath))
{
    Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialsPath);

    var rawCredential = GoogleCredential.FromFile(credentialsPath);
    var googleCredential = rawCredential.CreateScoped(
        "https://www.googleapis.com/auth/datastore",
        "https://www.googleapis.com/auth/cloud-platform"
    );

    FirebaseApp.Create(new AppOptions { Credential = rawCredential });
    Console.WriteLine($"Firebase Admin SDK inicializado usando credenciales en: {credentialsPath}");

    var firestoreDb = new FirestoreDbBuilder
    {
        ProjectId = firebaseProjectId,
        Credential = googleCredential
    }.Build();
    builder.Services.AddSingleton(firestoreDb);
    Console.WriteLine("FirestoreDb registrado en el contenedor de servicios.");
}
else
{
    Console.WriteLine("ADVERTENCIA: No se encontró el archivo firebase-service-account.json");
}

// 6. Registrar servicios de negocio (arquitectura 3 capas)
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<ILikeService, LikeService>();
builder.Services.AddScoped<SeedService>();

var app = builder.Build();

// 7. Middleware global de errores (ANTES de todo)
app.UseMiddleware<ExceptionMiddleware>();

// 8. Pipeline HTTP
app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// 9. Seed de datos de prueba (asíncrono al inicio)
try
{
    using var scope = app.Services.CreateScope();
    var seedService = scope.ServiceProvider.GetRequiredService<SeedService>();
    await seedService.SeedAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"No se pudieron sembrar datos de prueba: {ex.Message}");
}

app.Run();
