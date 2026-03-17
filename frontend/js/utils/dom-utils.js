/**
 * Utilidades para manipulación del DOM
 */
export class DomUtils {
  /**
   * Crea un elemento con atributos y contenido
   */
  static createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    if (content) {
      element.innerHTML = content;
    }
    
    return element;
  }

  /**
   * Muestra u oculta un elemento
   */
  static toggleVisibility(element, show) {
    if (!element) return;
    element.style.display = show ? 'block' : 'none';
  }

  /**
   * Añade o remueve una clase
   */
  static toggleClass(element, className, add) {
    if (!element) return;
    if (add) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }
}
