let listeners = [];

export function emitBlockUser(blockedUid) {
  listeners.forEach((cb) => cb(blockedUid));
}

export function subscribeBlockUser(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}
