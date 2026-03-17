/**
 * Script para renderizar header y footer dinámicamente
 * Carga canales desde endpoint API del backend
 */

import { APP_CONFIG } from './config/constants.js';

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch(APP_CONFIG.channelsDataUrl);
        if (!response.ok) throw new Error("Error loading channels: " + response.status);
        
        const data = await response.json();
        // El endpoint devuelve { success, count, channels, timestamp }
        const channels = data.channels || [];
        
        if (channels.length === 0) {
          console.warn('No canales retornados del API');
        }
        
        renderHeader(channels);
        renderFooter(channels);

    } catch (error) {
        console.error("Error updating navigation:", error);
        console.warn("Navigation links will not be available");
    }
});

function renderHeader(channels) {
    const navContainer = document.querySelector(".nav-links");
    if (!navContainer) return;

    const featured = channels.filter(c => c.is_featured);
    if (featured.length === 0) return;

    const customLabels = {
        "liga1max": "L1MAX",
        "dsports": "DIRECTV Sports",
        "golperu": "GOLPERÚ"
    };

    const currentStream = new URLSearchParams(window.location.search).get("stream");

    navContainer.innerHTML = featured.map(channel => {
        const label = customLabels[channel.id] || channel.name;
        const isActive = currentStream === channel.id ? 'active' : '';
        return `<a href="/canal?stream=${channel.id}" class="nav-link ${isActive}">${label}</a>`;
    }).join('');
}

function renderFooter(channels) {
    const footerContainer = document.querySelector("#footer-popular");
    if (!footerContainer) return;

    const footerIds = ["espn", "espn2", "espn3", "dsports", "foxsports", "foxsports2", "foxsports3", "golperu", "liga1max"];
    const footerChannels = footerIds
        .map(id => channels.find(c => c.id === id))
        .filter(c => c);

    if (footerChannels.length === 0) return;

    footerContainer.innerHTML = footerChannels.map(channel => 
        `<li><a href="/canal?stream=${channel.id}">${channel.name}</a></li>`
    ).join('');
}