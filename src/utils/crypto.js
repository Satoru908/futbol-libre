const crypto = require('crypto');
const env = require('../config/env');

// Clave secreta fija de 32 bytes para cifrar las URLs
// Se puede cambiar en las variables de entorno para mayor seguridad
const ENCRYPTION_KEY = env.SECRET_KEY || 'Futb0lLibreT0kenS3cr3t2026kEy32b'; 
const ALGORITHM = 'aes-256-cbc';

/**
 * Encripta una cadena de texto (URL)
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16); // Vector de inicialización aleatorio
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Formato: iv(hex) : datos_encriptados(hex)
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Crypto Encode Error:', error.message);
    return null;
  }
}

/**
 * Desencripta el token devolviendo la URL original
 */
function decrypt(token) {
  try {
    const textParts = token.split(':');
    if (textParts.length !== 2) return null;
    
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    return null; // Si el token es inválido o alguien intentó hakearlo
  }
}

module.exports = {
  encrypt,
  decrypt
};
