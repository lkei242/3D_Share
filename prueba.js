// app.js

// Variable
let nombre = "Luka";

// Función
function saludar(nombre) {
    console.log("Hola " + nombre);
}

// Ejecutar función
saludar(nombre);

// Array
let frutas = ["manzana", "banana", "pera"];

// Mostrar primer elemento
console.log(frutas[0]);

// Bucle
for (let i = 0; i < 3; i++) {
    console.log("Número: " + i);
}

// Objeto
let usuario = {
    nombre: "Luka",
    edad: 20
};

console.log(usuario.nombre);

// Condición
if (usuario.edad >= 18) {
    console.log("Es mayor de edad");
} else {
    console.log("Es menor de edad");
}

// ===============================
// JAVASCRIPT BÁSICO COMPLETO
// ===============================

// ---------------------------------
// VARIABLES
// ---------------------------------

nombre = "Luka";
let edad = 20;

console.log(nombre);
console.log(edad);

// ---------------------------------
// OPERACIONES
// ---------------------------------

let a = 10;
let b = 5;

console.log(a + b);
console.log(a - b);
console.log(a * b);
console.log(a / b);

// ---------------------------------
// CONDICIONES
// ---------------------------------

if (edad >= 18) {
    console.log("Mayor de edad");
} else {
    console.log("Menor de edad");
}

// ---------------------------------
// FUNCIONES
// ---------------------------------

function saludar(nombre) {
    console.log("Hola " + nombre);
}

saludar(nombre);

// Función con return

function sumar(num1, num2) {
    return num1 + num2;
}

let resultado = sumar(10, 20);

console.log(resultado);

// ---------------------------------
// ARRAYS
// ---------------------------------

frutas = ["manzana", "banana", "pera"];

console.log(frutas);

// Primer elemento
console.log(frutas[0]);

// Agregar elemento
frutas.push("naranja");

console.log(frutas);

// Cantidad de elementos
console.log(frutas.length);

// ---------------------------------
// LOOPS
// ---------------------------------

for (let i = 0; i < frutas.length; i++) {
    console.log(frutas[i]);
}

// ---------------------------------
// OBJETOS
// ---------------------------------

usuario = {
    nombre: "Luka",
    edad: 20,
    admin: true
};

console.log(usuario);

console.log(usuario.nombre);
console.log(usuario.edad);

// ---------------------------------
// FUNCIONES FLECHA
// ---------------------------------

const multiplicar = (x, y) => {
    return x * y;
};

console.log(multiplicar(5, 4));

// ---------------------------------
// ASYNC / AWAIT
// ---------------------------------
//función asincrónica
async function cargarDatos() {
    console.log("Cargando datos...");
}

cargarDatos();

// ---------------------------------
// EJEMPLO SIMPLE TIPO APP
// ---------------------------------

let usuarios = [];

function agregarUsuario(nombre, edad) {
    let nuevoUsuario = {
        nombre: nombre,
        edad: edad
    };

    usuarios.push(nuevoUsuario);
}

agregarUsuario("Luka", 20);
agregarUsuario("Juan", 25);

console.log(usuarios);

// ---------------------------------
// LOOP EN ARRAY DE OBJETOS
// ---------------------------------

for (let i = 0; i < usuarios.length; i++) {
    console.log(
        usuarios[i].nombre + " tiene " +
        usuarios[i].edad + " años"
    );
}

// ---------------------------------
// FINAL
// ---------------------------------

console.log("Programa terminado");