const { getAuth } = require('firebase-admin/auth');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado, token faltante' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar token con Firebase
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Inyectamos el usuario decodificado en la request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next(); // Continuar con la ruta
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};