/**
 * Utilidades de formato
 */
export class FormatUtils {
  /**
   * Formatea nombre de canal
   */
  static formatChannelName(streamParam) {
    const nameMap = {
      espn: 'ESPN',
      espn2: 'ESPN 2',
      espn3: 'ESPN 3',
      foxsports: 'Fox Sports',
      foxsports2: 'Fox Sports 2',
      foxsports3: 'Fox Sports 3',
      dsports: 'DSports',
      dsports2: 'DSports 2',
      golperu: 'GolPerú',
      goltv: 'GolTV',
      tycsports: 'TyC Sports',
      tntsports: 'TNT Sports'
    };
    return nameMap[streamParam] || streamParam.toUpperCase();
  }

  /**
   * Obtiene iniciales de un nombre
   */
  static getInitials(name, maxLength = 2) {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, maxLength)
      .toUpperCase();
  }

  /**
   * Formatea fecha
   */
  static formatDate(date = new Date(), locale = 'es-ES') {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(locale, options);
  }

  /**
   * Limpia texto de saltos de línea y espacios extra
   */
  static cleanText(text) {
    return text ? text.replace(/\n/g, '').trim() : '';
  }
}
