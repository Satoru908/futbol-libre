import { APP_CONFIG } from './config/constants.js';

document.addEventListener('DOMContentLoaded', () => {
    loadAgenda();
    setupAgendaAccordion();
    updateDateBanner();
    setupAutoRefresh();
});

let allEvents = [];
let currentCategory = 'Todos';
let refreshInterval = null;

async function loadAgenda() {
    const container = document.getElementById('events-container');
    if (!container) return;

    try {
        container.innerHTML = '<div style="text-align:center;padding:20px">Cargando agenda...</div>';
        
        const response = await fetch(APP_CONFIG.agendaDataUrl + '?t=' + Date.now());
        if (!response.ok) throw new Error('No se pudo cargar la agenda. Status: ' + response.status);
        
        const responseData = await response.json();
        // El endpoint devuelve { success, count, data, timestamp }
        allEvents = responseData.data || responseData;
        
        if (!Array.isArray(allEvents)) {
          throw new Error('Formato de respuesta inválido');
        }
        
        const categories = extractCategories(allEvents);
        renderCategories(categories);
        renderEvents(allEvents);

    } catch (error) {
        console.error('Error cargando agenda:', error);
        container.innerHTML = '<div style="text-align:center;padding:20px">No hay eventos disponibles. Error: ' + error.message + '</div>';
    }
}

function setupAutoRefresh() {
    // Actualizar cada 2 minutos para reflejar cambios de estado
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        console.log('Auto-actualizando agenda...');
        loadAgenda();
    }, 2 * 60 * 1000); // 2 minutos
}

function setupAgendaAccordion() {
    const agendaTitle = document.getElementById('agenda-title');
    const agendaContent = document.getElementById('agenda-content');

    if (agendaTitle && agendaContent) {
        agendaTitle.addEventListener('click', () => {
            const isHidden = agendaContent.classList.toggle('hidden');
            const icon = agendaTitle.querySelector('.toggle-icon');
            
            agendaTitle.classList.toggle('collapsed', isHidden);
            if (icon) icon.textContent = isHidden ? '+' : '−';
        });
    }
}

function updateDateBanner() {
    const dateBanner = document.querySelector('.date-banner span');
    if (dateBanner) {
        const now = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        dateBanner.textContent = `Agenda - ${now.toLocaleDateString('es-ES', options)}`;
    }
}

function extractCategories(events) {
    const categories = new Set(['Todos']);
    events.forEach(ev => {
        if (ev.category) categories.add(ev.category);
    });
    return Array.from(categories);
}

function renderCategories(categories) {
    const container = document.getElementById('categories-container');
    if (!container) return;

    container.innerHTML = categories.map(cat => `
        <button class="category ${cat === 'Todos' ? 'active' : ''}" 
                onclick="setCategory('${cat}')">
            ${cat}
        </button>
    `).join('');
}

window.setCategory = function(category) {
    currentCategory = category;
    
    document.querySelectorAll('.category').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === category);
    });

    filterEvents(category);
}

function filterEvents(category) {
    const filtered = category === 'Todos' 
        ? allEvents 
        : allEvents.filter(ev => ev.category === category);

    renderEvents(filtered);
}

function renderEvents(events) {
    const container = document.getElementById('events-container');
    
    // Filtrar eventos finalizados en el frontend también
    const activeEvents = events.filter(ev => !ev.isFinished);
    
    if (!activeEvents || activeEvents.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#666">No se encontraron eventos activos.</div>';
        return;
    }

    container.innerHTML = activeEvents.map(ev => {
        // Determinar el estado y estilo del botón
        let statusButton = '';
        let actionButton = '';
        
        if (ev.isLive) {
            statusButton = `
                <button class="status-button status-live">
                    <span style="color:#ff0000;margin-right:5px">●</span> EN VIVO
                </button>
            `;
            // Solo mostrar botón "Ver Canal" si está en vivo
            actionButton = `<a href="${ev.url}" class="copy-button">Ver Canal</a>`;
        } else if (ev.isUpcoming) {
            statusButton = `
                <button class="status-button status-upcoming">
                    <span style="margin-right:5px">🕒</span> PRONTO
                </button>
            `;
            // No mostrar botón de acción para eventos próximos
            actionButton = '';
        }
        
        return `
            <div class="event" data-category="${ev.category}" data-live="${ev.isLive}" data-status="${ev.status}">
                <div class="event-info">
                    <span class="event-time">${ev.time}</span>
                    <p class="event-name">${ev.title}</p>
                </div>
                
                <div class="buttons_container">
                    ${statusButton}
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}