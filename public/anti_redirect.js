// Ultra-Hardened Anti-Redirect & Host Enforcer for Ludo King Clone
(function() {
  console.log("%c[LUDO KING SHIELD] Anti-Redirect and Host Enforcer Active", "color: #00ff00; font-weight: bold; font-size: 14px;");

  const isExternalLudo = function(target) {
    if (!target) return false;
    const s = String(target).toLowerCase();
    return s.includes('ludoking.com') || s.includes('ludokingapi.com') || s.includes('play.google.com') || s.includes('googleads');
  };

  // 1. Freeze window.location navigation
  const origReplace = window.location.replace;
  window.location.replace = function(url) {
    if (isExternalLudo(url)) {
      console.warn('[SHIELD BLOCKED replace]:', url);
      return;
    }
    return origReplace.apply(this, arguments);
  };

  const origAssign = window.location.assign;
  window.location.assign = function(url) {
    if (isExternalLudo(url)) {
      console.warn('[SHIELD BLOCKED assign]:', url);
      return;
    }
    return origAssign.apply(this, arguments);
  };

  // Intercept window.open
  const origOpen = window.open;
  window.open = function(url) {
    if (isExternalLudo(url)) {
      console.warn('[SHIELD BLOCKED window.open]:', url);
      return null;
    }
    return origOpen.apply(this, arguments);
  };

  // 2. Prevent Frame-Busting / Window hijacking
  try {
    Object.defineProperty(window, 'top', {
      get: function() { return window.self; },
      set: function() {}
    });
    Object.defineProperty(window, 'parent', {
      get: function() { return window.self; },
      set: function() {}
    });
  } catch (e) {}

  // 3. Prevent beforeunload / unload redirect tricks
  window.addEventListener('beforeunload', function(e) {
    // Keep local session active
  });

})();
