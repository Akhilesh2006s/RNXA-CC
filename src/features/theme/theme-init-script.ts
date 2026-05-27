export const THEME_STORAGE_KEY = "founderos-theme";

/** Inline script for <head> — runs before paint to avoid theme flash. */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},t=localStorage.getItem(k)||'dark',h=document.documentElement;if(t==='light'){h.classList.remove('dark');}else{h.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;
