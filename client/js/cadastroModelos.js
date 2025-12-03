(function () {
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }
  const authUser = JSON.parse(authRaw);

  const userPill = document.getElementById('user-pill');
  userPill.textContent = `logado como ${authUser.username}`;

  const form = document.getElementById('modelo-form');
  const inputId = document.getElementById('modelo-id');
  const inputName = document.getElementById('model_name');
  const inputPath = document.getElementById('glb_path');
  const tableBody = document.querySelector('#modelos-table tbody');
  const formMessage = document.getElementById('form-message');

  async function loadModelos() {
    tableBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    try {
      const resp = await fetch('/api/modelos');
      const data = await resp.json();
      tableBody.innerHTML = '';
      data.forEach((m) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${m.id}</td>
          <td>${m.model_name}</td>
          <td>${m.glb_path}</td>
          <td>
            <button type="button" class="secondary" data-edit="${m.id}">Editar</button>
            <button type="button" class="danger" data-del="${m.id}">Excluir</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="4">Erro ao carregar modelos.</td></tr>';
    }
  }

  function clearForm() {
    inputId.value = '';
    inputName.value = '';
    inputPath.value = '';
    formMessage.textContent = '';
  }

  document.getElementById('btn-novo').addEventListener('click', () => {
    clearForm();
    inputName.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMessage.textContent = '';

    const model_name = inputName.value.trim();
    const glb_path = inputPath.value.trim();
    if (!model_name || !glb_path) {
      formMessage.textContent = 'Preencha todos os campos.';
      return;
    }

    const id = inputId.value ? Number(inputId.value) : null;
    const payload = { model_name, glb_path };

    try {
      let resp;
      if (id) {
        resp = await fetch(`/api/modelos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch('/api/modelos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!resp.ok) {
        const errData = await resp.json();
        formMessage.textContent = errData.error || 'Erro ao salvar.';
        return;
      }
      clearForm();
      await loadModelos();
      formMessage.textContent = 'Salvo com sucesso.';
    } catch (err) {
      console.error(err);
      formMessage.textContent = 'Erro de comunicação com servidor.';
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');
    if (editId) {
      try {
        const resp = await fetch('/api/modelos');
        const data = await resp.json();
        const m = data.find((x) => x.id === Number(editId));
        if (!m) return;
        inputId.value = m.id;
        inputName.value = m.model_name;
        inputPath.value = m.glb_path;
        formMessage.textContent = 'Editando modelo.';
      } catch (err) {
        console.error(err);
      }
    } else if (delId) {
      const ok = window.confirm('Deseja realmente excluir este modelo?');
      if (!ok) return;
      try {
        const resp = await fetch(`/api/modelos/${delId}`, { method: 'DELETE' });
        if (!resp.ok) {
          alert('Erro ao excluir.');
          return;
        }
        await loadModelos();
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
    formMessage.textContent = 'Executando refresh...';
    try {
      const resp = await fetch('/api/system/refresh', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        formMessage.textContent = data.error || 'Falha ao executar refresh.';
        return;
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      formMessage.textContent = 'Erro ao conectar ao servidor para refresh.';
    }
  });

  loadModelos();
})();
