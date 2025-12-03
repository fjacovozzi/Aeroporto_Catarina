// client/js/mainMenu.js

(function () {
  const userPill = document.getElementById('user-pill');
  const msgDiv = document.getElementById('menu-message');

  // Checa se está logado
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }

  const authUser = JSON.parse(authRaw);
  userPill.textContent = `logado como ${authUser.username}`;

  // Navegação para as páginas (vamos criar essas páginas depois)
  document.getElementById('btn-3d').addEventListener('click', () => {
    // futura viewer3d.html
    window.location.href = './viewer3d.html';
  });

  document.getElementById('btn-prefixos').addEventListener('click', () => {
    window.location.href = './cadastroPrefixos.html';
  });

  document.getElementById('btn-modelos').addEventListener('click', () => {
    window.location.href = './cadastroModelos.html';
  });

  document.getElementById('btn-hangars').addEventListener('click', () => {
    window.location.href = './cadastroHangars.html';
  });

  document.getElementById('btn-users').addEventListener('click', () => {
    window.location.href = './cadastroUsuarios.html';
  });

  document.getElementById('btn-paths').addEventListener('click', () => {
    window.location.href = './cadastroPaths.html';
  });

  document.getElementById('btn-placements-saved').addEventListener('click', () => {
    window.location.href = './placementsSavedView.html';
  });

  // Botão Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('authUser');
    window.location.href = './login.html';
  });

  // Botão Refresh (reset lógico)
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    const ok = window.confirm('Isso vai descartar posições não salvas. Deseja continuar?');
    if (!ok) return;

    msgDiv.textContent = 'Executando refresh do sistema...';

    try {
      const resp = await fetch('/api/system/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        msgDiv.textContent = data.error || 'Falha ao executar refresh.';
        return;
      }

      // Depois do refresh, recarrega a página
      window.location.reload();
    } catch (err) {
      console.error('Refresh error:', err);
      msgDiv.textContent = 'Erro ao conectar ao servidor para refresh.';
    }
  });
})();
