// This file runs *before* the page loads to prevent a theme flash.

(function() {
    const savedTheme = localStorage.getItem('theme');
    
    // We now default to 'dark' if no theme is saved or if it's 'dark'.
    // We only switch to 'light' if it's explicitly saved as 'light'.
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-color-scheme', 'light');
    } else {
        document.documentElement.setAttribute('data-color-scheme', 'dark');
    }
})();