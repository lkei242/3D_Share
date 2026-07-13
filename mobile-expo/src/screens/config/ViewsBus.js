




let listeners = [];

export function emitViewIncrement(postId) {
  listeners.forEach((cb) => cb(postId));
}

export function subscribeViewIncrement(callback) {
  listeners.push(callback);
  
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}