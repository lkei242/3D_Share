const { getAuth } = require('firebase-admin/auth');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado, token faltante' });
    }

    const token = authHeader.split(' ')[1];
    
    
    const decodedToken = await getAuth().verifyIdToken(token);
    
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next(); 
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};