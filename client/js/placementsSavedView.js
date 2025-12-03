(function () {
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }
  const authUser = JSON.parse(authRaw);
  document.getElementById('user-pill').textContent = `logado como ${authUser.username}`;

  const form = document.getElementById('placement-form');
  const msg = document.getElementById('form-message');
  const tableBody = document.querySelector('#placements-table tbody');

  const inputId = document.getElementById('placement-id');
  const inputPrefixo = document.getElementById('prefixo');
  const inputModelName = document.getElementById('model_name');
  const inputX = document.getElementById('x');
  const inputY = document.getElementById('y');
  const inputHeading = document.getElementById('heading_deg');
  const inputHangarName = document.getElementById('hangar_name');

  async function loadPlacements() {
    tableBody.innerHTML = '<tr><td colspan="8">Carregando...</td></tr>';
    try {
      const resp = await fetch('/api/placements/saved');
      const data = await resp.json();
      tableBody.innerHTML = '';
      data.forEach((p) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.prefixo || ''}</td>
          <td>${p.model_name || ''}</td>
          <td>${p.x ?? ''}</td>
          <td>${p.y ?? ''}</td>
          <td>${p.heading_deg ?? ''}</td>
          <td>${p.hangar_name || ''}</td>
          <td>
            <button type="button" class="secondary" data-edit="${p.id}">Editar</button>
            <button type="button" class="danger" data-del="${p.id}">Excluir</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="8">Erro ao carregar placements_saved.</td></tr>';
    }
  }

  function clearForm() {
    inputId.value = '';
    inputPrefixo.value = '';
    inputModelName.value = '';
    inputX.value = '';
    inputY.value = '';
    inputHeading.value = '0';
    inputHangarName.value = '';
    msg.textContent = '';
  }

  document.getElementById('btn-novo').addEventListener('click', () => {
    clearForm();
    inputPrefixo.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    if (!inputPrefixo.value.trim() || !inputModelName.value.trim()) {
      msg.textContent = 'Prefixo e modelo são obrigatórios.';
      return;
    }

    const payload = {
      prefixo: inputPrefixo.value.trim(),
      model_name: inputModelName.value.trim(),
      x: inputX.value !== '' ? Number(inputX.value) : null,
      y: inputY.value !== '' ? Number(inputY.value) : null,
      heading_deg: inputHeading.value !== '' ? Number(inputHeading.value) : 0,
      hangar_name: inputHangarName.value || null,
    };

    const id = inputId.value ? Number(inputId.value) : null;

    try {
      let resp;
      if (id) {
        resp = await fetch(`/api/placements/saved/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch('/api/placements/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        msg.textContent = data.error || 'Erro ao salvar placement.';
        return;
      }

      clearForm();
      msg.textContent = 'Placement salvo com sucesso.';
      await loadPlacements();
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro ao se comunicar com servidor.';
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');

    if (editId) {
      const resp = await fetch('/api/placements/saved');
      const data = await resp.json();
      const p = data.find((x) => x.id === Number(editId));
      if (!p) return;

      inputId.value = p.id;
      inputPrefixo.value = p.prefixo || '';
      inputModelName.value = p.model_name || '';
      inputX.value = p.x ?? '';
      inputY.value = p.y ?? '';
      inputHeading.value = p.heading_deg ?? 0;
      inputHangarName.value = p.hangar_name || '';
      msg.textContent = 'Editando placement.';
    } else if (delId) {
      const ok = window.confirm('Deseja excluir este registro?');
      if (!ok) return;
      try {
        const resp = await fetch(`/api/placements/saved/${delId}`, { method: 'DELETE' });
        if (!resp.ok) {
          alert('Erro ao excluir placement.');
          return;
        }
        await loadPlacements();
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

  loadPlacements();
})();
