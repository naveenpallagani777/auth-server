const fs = require('fs');
const path = require('path');

// Read assets once at startup
const styles = fs.readFileSync(path.join(__dirname, '../styles/auth.css'), 'utf8');
const clientScript = fs.readFileSync(path.join(__dirname, '../scripts/auth.client.js'), 'utf8');

const pageHead = (title) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>${styles}</style>
</head>`;

const bgOrbs = () => `
    <div class="bg">
        <div class="bg-orb bg-orb-1"></div>
        <div class="bg-orb bg-orb-2"></div>
        <div class="bg-orb bg-orb-3"></div>
    </div>`;

const scripts = () => `<script>${clientScript}</script>`;

module.exports = {
    pageHead,
    bgOrbs,
    scripts
};
