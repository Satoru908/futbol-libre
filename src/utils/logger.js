/**
 * Logger utility para sanitizar información sensible en logs
 */
class Logger {
  constructor() {
    this.sensitivePatterns = [
      /token=[^&\s]+/gi,
      /key=[^&\s]+/gi,
      /password=[^&\s]+/gi,
      /authorization:\s*[^\s]+/gi,
      /bearer\s+[^\s]+/gi
    ];
  }

  /**
   * Sanitiza URLs y strings removiendo información sensible
   */
  sanitize(text) {
    if (!text) return text;
    
    let sanitized = String(text);
    this.sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        const key = match.split('=')[0] || match.split(':')[0];
        return `${key}=***`;
      });
    });
    
    return sanitized;
  }

  info(message, ...args) {
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'string' ? this.sanitize(arg) : arg
    );
    console.log(`[INFO] ${message}`, ...sanitizedArgs);
  }

  warn(message, ...args) {
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'string' ? this.sanitize(arg) : arg
    );
    console.warn(`[WARN] ${message}`, ...sanitizedArgs);
  }

  error(message, ...args) {
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'string' ? this.sanitize(arg) : arg
    );
    console.error(`[ERROR] ${message}`, ...sanitizedArgs);
  }

  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

module.exports = new Logger();
