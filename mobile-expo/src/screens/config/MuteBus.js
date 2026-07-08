let listeners = [];

export function emitMuteUser(mutedUid) {
  listeners.forEach((cb) => cb(mutedUid));
}

export function subscribeMuteUser(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((cb) => cb !== callback);
  };
}
