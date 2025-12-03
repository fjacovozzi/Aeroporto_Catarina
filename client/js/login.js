// client/js/login.js

(function () {
  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');

  // Se já estiver logado, manda direto pro menu
  const existing = sessionStorage.getItem('authUser');
  if (existing) {
    window.location.href = './mainMenu.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    const username = form.username.value.trim();
    const password = form.password.value.trim();

    if (!username || !password) {
      errorDiv.textContent = 'Preencha usuário e senha.';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        errorDiv.textContent = data.error || 'Credenciais inválidas.';
        errorDiv.style.display = 'block';
        return;
      }

      // guarda info básica na sessão
      sessionStorage.setItem('authUser', JSON.stringify(data.user));

      // redireciona pro menu principal
      window.location.href = './mainMenu.html';
    } catch (err) {
      console.error('Login error:', err);
      errorDiv.textContent = 'Erro ao conectar ao servidor.';
      errorDiv.style.display = 'block';
    }
  });
})();
