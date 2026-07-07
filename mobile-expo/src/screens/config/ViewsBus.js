// src/config/viewsBus.js
// Bus de eventos mínimo para avisar incrementos de vistas entre pantallas
// sin pasar funciones por los params de navegación (lo cual React Navigation
// marca como "non-serializable" y puede romper la persistencia de estado).

let listeners = [];

export function emitViewIncrement(postId) {
  listeners.forEach((cb) => cb(postId));
}

export function subscribeViewIncrement(callback) {
  listeners.push(callback);
  // Devuelve una función para desuscribirse (usar en el cleanup del useEffect)
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}