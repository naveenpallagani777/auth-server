/**
 * Shared UI components and utilities for auth views
 */

const shieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

const phoneCountries = [
    { code: '+91', country: 'IN', name: 'India' },
    { code: '+1', country: 'US', name: 'United States' },
    { code: '+44', country: 'GB', name: 'United Kingdom' },
    { code: '+61', country: 'AU', name: 'Australia' },
    { code: '+81', country: 'JP', name: 'Japan' },
    { code: '+49', country: 'DE', name: 'Germany' },
    { code: '+33', country: 'FR', name: 'France' },
    { code: '+971', country: 'AE', name: 'UAE' },
    { code: '+65', country: 'SG', name: 'Singapore' },
    { code: '+86', country: 'CN', name: 'China' },
];

const flagImg = (cc) => `<img src="https://flagcdn.com/w40/${cc.toLowerCase()}.png" alt="${cc}" />`;

const phoneSelectHtml = (id = 'phoneCode') => {
    const first = phoneCountries[0];
    return `
    <div class="phone-dropdown" id="${id}-dropdown">
        <input type="hidden" name="phoneCode" id="${id}" value="${first.code}" />
        <div class="phone-dropdown-btn" tabindex="0" id="${id}-btn">
            ${flagImg(first.country)}
            <span id="${id}-label">${first.code}</span>
            <span class="arrow">&#9660;</span>
        </div>
        <div class="phone-dropdown-list" id="${id}-list">
            ${phoneCountries.map(c => `<div class="phone-dropdown-item${c.code === first.code ? ' selected' : ''}" data-code="${c.code}" data-country="${c.country}">${flagImg(c.country)} ${c.code}</div>`).join('')}
        </div>
    </div>
    `;
};

/** Escape HTML entities to prevent XSS in error messages */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

module.exports = {
    shieldIcon,
    phoneCountries,
    flagImg,
    phoneSelectHtml,
    escapeHtml
};
