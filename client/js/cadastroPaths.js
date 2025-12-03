(function () {
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }
  const authUser = JSON.parse(authRaw);
  document.getElementById('user-pill').textContent = `logado como ${authUser.username}`;

  const form = document.getElementById('path-form');
  const msg = document.getElementById('form-message');
  const tableBody = document.querySelector('#paths-table tbody');

  const inputId = document.getElementById('path-id');
  const inputName = document.getElementById('name');
  const inputDesc = document.getElementById('description');
  const selectHangar = document.getElementById('hangar_name');
  const txtPoints = document.getElementById('points');

  async function loadHangares() {
    const resp = await fetch('/api/hangars');
    const hangares = await resp.json();
    // "(nenhum)" já está
    hangares.forEach((h) => {
      const opt = document.createElement('option');
      opt.value = h.hangar_name;
      opt.textContent = h.hangar_name;
      selectHangar.appendChild(opt);
    });
  }

  function parsePoints(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((l) => {
      const [xStr, yStr] = l.split(',').map((v) => v.trim());
      return { x: Number(xStr), y: Number(yStr) };
    });
  }

  function formatPoints(points) {
    return (points || []).map((p) => `${p.x},${p.y}`).join('\n');
  }

  async function loadPaths() {
    tableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
      const resp = await fetch('/api/paths');
      const data = await resp.json();
      tableBody.innerHTML = '';
      data.forEach((p) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.name}</td>
          <td>${p.hangar_name || ''}</td>
          <td>${(p.points || []).length}</td>
          <td>
            <button type="button" class="secondary" data-edit="${p.id}">Editar</button>
            <button type="button" class="danger" data-del="${p.id}">Excluir</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar paths.</td></tr>';
    }
  }

  function clearForm() {
    inputId.value = '';
    inputName.value = '';
    inputDesc.value = '';
    selectHangar.value = '';
    txtPoints.value = '';
    msg.textContent = '';
  }

  document.getElementById('btn-novo').addEventListener('click', () => {
    clearForm();
    inputName.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    if (!inputName.value.trim()) {
      msg.textContent = 'Nome é obrigatório.';
      return;
    }

    let points = [];
    if (txtPoints.value.trim()) {
      try {
        points = parsePoints(txtPoints.value);
      } catch {
        msg.textContent = 'Erro ao interpretar os pontos. Use formato "x,y" por linha.';
        return;
      }
    }

    const payload = {
      name: inputName.value.trim(),
      description: inputDesc.value || '',
      hangar_name: selectHangar.value || null,
      points,
    };

    const id = inputId.value ? Number(inputId.value) : null;

    try {
      let resp;
      if (id) {
        resp = await fetch(`/api/paths/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch('/api/paths', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        msg.textContent = data.error || 'Erro ao salvar path.';
        return;
      }

      clearForm();
      msg.textContent = 'Path salvo com sucesso.';
      await loadPaths();
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro ao se comunicar com servidor.';
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');

    if (editId) {
      const resp = await fetch('/api/paths');
      const data = await resp.json();
      const p = data.find((x) => x.id === Number(editId));
      if (!p) return;

      inputId.value = p.id;
      inputName.value = p.name;
      inputDesc.value = p.description || '';
      selectHangar.value = p.hangar_name || '';
      txtPoints.value = formatPoints(p.points || []);
      msg.textContent = 'Editando path.';
    } else if (delId) {
      const ok = window.confirm('Deseja excluir este path?');
      if (!ok) return;
      try {
        const resp = await fetch(`/api/paths/${delId}`, { method: 'DELETE' });
        if (!resp.ok) {
          alert('Erro ao excluir path.');
          return;
        }
        await loadPaths();
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

  (async () => {
    await loadHangares();
    await loadPaths();
  })();
})();
