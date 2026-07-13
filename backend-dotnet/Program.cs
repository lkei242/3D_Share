using System;
using System.IO;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 1. Agregar soporte para controladores
builder.Services.AddControllers();

// 2. Configurar CORS (permitir cualquier origen, método y cabecera para desarrollo)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 3. Configurar la autenticación JWT Bearer con Firebase
const string firebaseProjectId = "dshare-6b84f";
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

// 4. Inicializar Firebase Admin SDK y registrar FirestoreDb
string credentialsPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "firebase-service-account.json");
if (!File.Exists(credentialsPath))
{
    // Intentar buscar en el directorio base de ejecución
    credentialsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "firebase-service-account.json");
}

if (File.Exists(credentialsPath))
{
    // Establecer variable de entorno para Google Cloud SDK (Firestore)
    Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialsPath);

    var rawCredential = GoogleCredential.FromFile(credentialsPath);
    var googleCredential = rawCredential.CreateScoped(
        "https://www.googleapis.com/auth/datastore",
        "https://www.googleapis.com/auth/cloud-platform"
    );

    // Inicializar FirebaseApp
    FirebaseApp.Create(new AppOptions
    {
        Credential = rawCredential
    });
    Console.WriteLine($"🚀 Firebase Admin SDK inicializado usando credenciales en: {credentialsPath}");

    // Registrar FirestoreDb como Singleton con credenciales con scopes explícitos
    var firestoreDb = new FirestoreDbBuilder
    {
        ProjectId = firebaseProjectId,
        Credential = googleCredential
    }.Build();
    builder.Services.AddSingleton(firestoreDb);
    Console.WriteLine("🚀 FirestoreDb registrado en el contenedor de servicios con scopes explícitos.");
}
else
{
    Console.WriteLine("⚠️ ADVERTENCIA: No se encontró el archivo firebase-service-account.json en la ruta especificada.");
}

// 5. Configurar OpenAPI para documentación (opcional)
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// Configurar el pipeline HTTP
app.UseCors("AllowAll");

app.UseHttpsRedirection();

// El middleware de autenticación DEBE ejecutarse antes de la autorización
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
