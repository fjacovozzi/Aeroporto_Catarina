(function () {
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }
  const authUser = JSON.parse(authRaw);
  document.getElementById('user-pill').textContent = `logado como ${authUser.username}`;

  const form = document.getElementById('user-form');
  const msg = document.getElementById('form-message');
  const tableBody = document.querySelector('#users-table tbody');

  const inputId = document.getElementById('user-id');
  const inputUsername = document.getElementById('username');
  const inputPassword = document.getElementById('password');
  const selectRole = document.getElementById('role');
  const chkActive = document.getElementById('active');

  async function loadUsers() {
    tableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
      const resp = await fetch('/api/users');
      const data = await resp.json();
      tableBody.innerHTML = '';
      data.forEach((u) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.id}</td>
          <td>${u.username}</td>
          <td>${u.role}</td>
          <td>${u.active ? 'Sim' : 'Não'}</td>
          <td>
            <button type="button" class="secondary" data-edit="${u.id}">Editar</button>
            <button type="button" class="danger" data-del="${u.id}">Excluir</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar usuários.</td></tr>';
    }
  }

  function clearForm() {
    inputId.value = '';
    inputUsername.value = '';
    inputPassword.value = '';
    selectRole.value = 'admin';
    chkActive.checked = true;
    msg.textContent = '';
  }

  document.getElementById('btn-novo').addEventListener('click', () => {
    clearForm();
    inputUsername.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    if (!inputUsername.value.trim() || !inputPassword.value.trim()) {
      msg.textContent = 'Usuário e senha são obrigatórios.';
      return;
    }

    const payload = {
      username: inputUsername.value.trim(),
      password: inputPassword.value.trim(),
      role: selectRole.value,
      active: chkActive.checked,
    };

    const id = inputId.value ? Number(inputId.value) : null;

    try {
      let resp;
      if (id) {
        resp = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        msg.textContent = data.error || 'Erro ao salvar usuário.';
        return;
      }

      clearForm();
      msg.textContent = 'Usuário salvo com sucesso.';
      await loadUsers();
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro ao se comunicar com servidor.';
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');

    if (editId) {
      const resp = await fetch('/api/users');
      const data = await resp.json();
      const u = data.find((x) => x.id === Number(editId));
      if (!u) return;

      inputId.value = u.id;
      inputUsername.value = u.username;
      inputPassword.value = u.password;
      selectRole.value = u.role;
      chkActive.checked = !!u.active;
      msg.textContent = 'Editando usuário.';
    } else if (delId) {
      const ok = window.confirm('Deseja excluir este usuário?');
      if (!ok) return;
      try {
        const resp = await fetch(`/api/users/${delId}`, { method: 'DELETE' });
        if (!resp.ok) {
          alert('Erro ao excluir usuário.');
          return;
        }
        await loadUsers();
      } catch (err) {
        console.error(err);
        alert('Erro de rede ao excluir.');
      }
    }
  });

  // Navegação / Refresh / Logout
  document.getElementById('btn-menu').addEventListener('click', () => {
    window.location.href = './mainMenu.html';
  });
  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('authUser');
    window.location.href = './login.html';
  });
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    const ok = window.confirm('Isso vai descartar posições não salvas. Deseja continuar?');
    if (!ok) return;
    msg.textContent = 'Executando refresh...';
    try {
      const resp = await fetch('/api/system/refresh', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        msg.textContent = data.error || 'Falha ao executar refresh.';
        return;
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro ao conectar ao servidor para refresh.';
    }
  });

  loadUsers();
})();
