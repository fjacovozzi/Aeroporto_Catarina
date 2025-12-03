(function () {
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }
  const authUser = JSON.parse(authRaw);
  document.getElementById('user-pill').textContent = `logado como ${authUser.username}`;

  const form = document.getElementById('hangar-form');
  const msg = document.getElementById('form-message');
  const tableBody = document.querySelector('#hangars-table tbody');

  const inputId = document.getElementById('hangar-id');
  const inputName = document.getElementById('hangar_name');
  const posX = document.getElementById('pos_x');
  const posY = document.getElementById('pos_y');
  const sW = document.getElementById('size_width');
  const sD = document.getElementById('size_depth');
  const sH = document.getElementById('size_height');
  const rot = document.getElementById('rotation_deg');
  const doorWall = document.getElementById('door_wall');
  const doorW = document.getElementById('door_width');
  const doorH = document.getElementById('door_height');
  const doorB = document.getElementById('door_bottom_z');

  async function loadHangars() {
    tableBody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
    try {
      const resp = await fetch('/api/hangars');
      const data = await resp.json();
      tableBody.innerHTML = '';
      data.forEach((h) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${h.id}</td>
          <td>${h.hangar_name}</td>
          <td>${h.hangar_position.x.toFixed(1)}, ${h.hangar_position.y.toFixed(1)}</td>
          <td>${h.size.width}x${h.size.depth}x${h.size.height}</td>
          <td>${h.door.wall} (${h.door.width}x${h.door.height}@${h.door.bottom_z})</td>
          <td>
            <button type="button" class="secondary" data-edit="${h.id}">Editar</button>
            <button type="button" class="danger" data-del="${h.id}">Excluir</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="6">Erro ao carregar hangares.</td></tr>';
    }
  }

  function clearForm() {
    inputId.value = '';
    inputName.value = '';
    posX.value = '';
    posY.value = '';
    sW.value = '';
    sD.value = '';
    sH.value = '';
    rot.value = '0';
    doorWall.value = 'front';
    doorW.value = '';
    doorH.value = '';
    doorB.value = '';
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
      msg.textContent = 'Nome do hangar é obrigatório.';
      return;
    }

    const payload = {
      hangar_name: inputName.value.trim(),
      hangar_position: {
        x: Number(posX.value || 0),
        y: Number(posY.value || 0),
      },
      size: {
        width: Number(sW.value || 0),
        depth: Number(sD.value || 0),
        height: Number(sH.value || 0),
      },
      rotation_deg: Number(rot.value || 0),
      door: {
        wall: doorWall.value,
        width: Number(doorW.value || 0),
        height: Number(doorH.value || 0),
        bottom_z: Number(doorB.value || 0),
      },
    };

    const id = inputId.value ? Number(inputId.value) : null;

    try {
      let resp;
      if (id) {
        resp = await fetch(`/api/hangars/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch('/api/hangars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        msg.textContent = data.error || 'Erro ao salvar hangar.';
        return;
      }

      clearForm();
      msg.textContent = 'Hangar salvo com sucesso.';
      await loadHangars();
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro ao se comunicar com servidor.';
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');

    if (editId) {
      const resp = await fetch('/api/hangars');
      const data = await resp.json();
      const h = data.find((x) => x.id === Number(editId));
      if (!h) return;

      inputId.value = h.id;
      inputName.value = h.hangar_name;
      posX.value = h.hangar_position.x;
      posY.value = h.hangar_position.y;
      sW.value = h.size.width;
      sD.value = h.size.depth;
      sH.value = h.size.height;
      rot.value = h.rotation_deg || 0;
      doorWall.value = h.door.wall;
      doorW.value = h.door.width;
      doorH.value = h.door.height;
      doorB.value = h.door.bottom_z;
      msg.textContent = 'Editando hangar.';
    } else if (delId) {
      const ok = window.confirm('Deseja excluir este hangar?');
      if (!ok) return;
      try {
        const resp = await fetch(`/api/hangars/${delId}`, { method: 'DELETE' });
        if (!resp.ok) {
          alert('Erro ao excluir hangar.');
          return;
        }
        await loadHangars();
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

  loadHangars();
})();
