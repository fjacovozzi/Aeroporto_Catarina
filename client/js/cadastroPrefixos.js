(function () {
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }
  const authUser = JSON.parse(authRaw);
  document.getElementById('user-pill').textContent = `logado como ${authUser.username}`;

  const form = document.getElementById('prefixo-form');
  const msg = document.getElementById('form-message');
  const tableBody = document.querySelector('#prefixos-table tbody');

  const inputId = document.getElementById('prefixo-id');
  const inputPrefixo = document.getElementById('prefixo');
  const selectModelo = document.getElementById('model_name');
  const inputEta = document.getElementById('eta');
  const inputEtd = document.getElementById('etd');
  const selectHangarPref = document.getElementById('hangarPreferencial');
  const chkHangarObrig = document.getElementById('hangarObrigatorio');
  const chkPodeAoTempo = document.getElementById('podeAoTempo');
  const selectPrioridade = document.getElementById('prioridade');
  const inputServicos = document.getElementById('servicos');
  const inputObs = document.getElementById('observacoes');

  async function loadModelosEHangares() {
    // modelos
    const mResp = await fetch('/api/modelos');
    const modelos = await mResp.json();
    selectModelo.innerHTML = '';
    modelos.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.model_name;
      opt.textContent = m.model_name;
      selectModelo.appendChild(opt);
    });

    // hangares
    const hResp = await fetch('/api/hangars');
    const hangares = await hResp.json();
    // primeira opção já é "(nenhum)"
    hangares.forEach((h) => {
      const opt = document.createElement('option');
      opt.value = h.hangar_name;
      opt.textContent = h.hangar_name;
      selectHangarPref.appendChild(opt);
    });
  }

  async function loadPrefixos() {
    tableBody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
    try {
      const resp = await fetch('/api/prefixos');
      const data = await resp.json();
      tableBody.innerHTML = '';
      data.forEach((p) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.id}</td>
          <td>${p.prefixo}</td>
          <td>${p.model_name}</td>
          <td>${p.hangarPreferencial || ''}</td>
          <td>${p.prioridade || ''}</td>
          <td>
            <button type="button" class="secondary" data-edit="${p.id}">Editar</button>
            <button type="button" class="danger" data-del="${p.id}">Excluir</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="6">Erro ao carregar prefixos.</td></tr>';
    }
  }

  function clearForm() {
    inputId.value = '';
    inputPrefixo.value = '';
    inputEta.value = '';
    inputEtd.value = '';
    selectHangarPref.value = '';
    chkHangarObrig.checked = false;
    chkPodeAoTempo.checked = false;
    selectPrioridade.value = 'normal';
    inputServicos.value = '';
    inputObs.value = '';
    msg.textContent = '';
  }

  document.getElementById('btn-novo').addEventListener('click', () => {
    clearForm();
    inputPrefixo.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const prefixo = inputPrefixo.value.trim();
    const model_name = selectModelo.value;
    if (!prefixo || !model_name) {
      msg.textContent = 'Prefixo e modelo são obrigatórios.';
      return;
    }

    const payload = {
      prefixo,
      model_name,
      eta: inputEta.value || null,
      etd: inputEtd.value || null,
      hangarPreferencial: selectHangarPref.value || null,
      hangarObrigatorio: chkHangarObrig.checked,
      podeAoTempo: chkPodeAoTempo.checked,
      servicos: inputServicos.value ? [inputServicos.value] : [],
      prioridade: selectPrioridade.value || 'normal',
      observacoes: inputObs.value || '',
    };

    const id = inputId.value ? Number(inputId.value) : null;

    try {
      let resp;
      if (id) {
        resp = await fetch(`/api/prefixos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch('/api/prefixos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await resp.json();
      if (!resp.ok) {
        msg.textContent = data.error || 'Erro ao salvar prefixo.';
        return;
      }
      clearForm();
      msg.textContent = 'Salvo com sucesso.';
      await loadPrefixos();
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro de rede ao salvar prefixo.';
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');

    if (editId) {
      const resp = await fetch('/api/prefixos');
      const data = await resp.json();
      const p = data.find((x) => x.id === Number(editId));
      if (!p) return;

      inputId.value = p.id;
      inputPrefixo.value = p.prefixo;
      selectModelo.value = p.model_name;
      inputEta.value = p.eta || '';
      inputEtd.value = p.etd || '';
      selectHangarPref.value = p.hangarPreferencial || '';
      chkHangarObrig.checked = !!p.hangarObrigatorio;
      chkPodeAoTempo.checked = !!p.podeAoTempo;
      selectPrioridade.value = p.prioridade || 'normal';
      inputServicos.value = p.servicos && p.servicos.length ? p.servicos.join(', ') : '';
      inputObs.value = p.observacoes || '';
      msg.textContent = 'Editando prefixo.';
    } else if (delId) {
      const ok = window.confirm('Deseja excluir este prefixo?');
      if (!ok) return;
      try {
        const resp = await fetch(`/api/prefixos/${delId}`, { method: 'DELETE' });
        if (!resp.ok) {
          alert('Erro ao excluir prefixo.');
          return;
        }
        await loadPrefixos();
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
    await loadModelosEHangares();
    await loadPrefixos();
  })();
})();
