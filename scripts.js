document.addEventListener('DOMContentLoaded', () => {

  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwHaFDQQ7eu7al2kC3Y1m3MrS5EvQ66E7_4Yq8JYIV0dFfhHzbHYHa1DCqoKtV5Kly5hA/exec';

  const form = document.getElementById('feedbackForm');
  const msgEl = document.getElementById('formMsg');

  const inputCorreo = document.getElementById('correo');
  const inputArea = document.getElementById('area');
  const inputUbic = document.getElementById('ubicacion');
  const categoriaRadios = Array.from(document.querySelectorAll('input[name="categoria"]'));
  const categoriaOtro = document.getElementById('categoria_otro');
  const descripcion = document.getElementById('descripcion');
  const impactChecks = Array.from(document.querySelectorAll('input[name="impact"]'));
  const impactNone = document.getElementById('impact_none');
  const evidenceInput = document.getElementById('evidence');
  const evidencePreviewWrap = document.getElementById('evidencePreviewWrap');
  const evidencePreview = document.getElementById('evidencePreview');
  const urgenciaRadios = Array.from(document.querySelectorAll('input[name="urgencia"]'));

  function showMessage(text, ok = true, persistMs = 7000) {
    if (!msgEl) return;
    msgEl.classList.remove('msg-success', 'msg-error', 'msg-fade-in');
    msgEl.classList.add(ok ? 'msg-success' : 'msg-error', 'msg-fade-in');
    msgEl.textContent = text;
    clearTimeout(form._msgTimeout);
    form._msgTimeout = setTimeout(() => {
      msgEl.textContent = '';
      msgEl.classList.remove('msg-success', 'msg-error', 'msg-fade-in');
    }, persistMs);
  }

  function getSelectedRadioValue(radios) {
    const r = radios.find(x => x.checked);
    return r ? r.value : '';
  }

  // Mostrar/ocultar input "Otro" para categoría
  categoriaRadios.forEach(r => r.addEventListener('change', () => {
    if (r.checked && r.value === 'Otro') {
      categoriaOtro.style.display = '';
      categoriaOtro.required = true;
      categoriaOtro.focus();
    } else if (r.checked) {
      categoriaOtro.style.display = 'none';
      categoriaOtro.required = false;
      categoriaOtro.value = '';
    }
  }));

  // Lógica de impactos (Ninguna exclusiva)
  impactChecks.forEach(ch => ch.addEventListener('change', () => {
    if (ch === impactNone) {
      if (impactNone.checked) impactChecks.forEach(c => { if (c !== impactNone) c.checked = false; });
    } else {
      if (ch.checked) impactNone.checked = false;
    }
  }));

  // Preview y validación del archivo
  evidenceInput.addEventListener('change', () => {
    const f = evidenceInput.files && evidenceInput.files[0];
    if (!f) { evidencePreviewWrap.style.display = 'none'; return; }
    const max = 10 * 1024 * 1024; // 10MB
    if (!f.type.startsWith('image/')) {
      showMessage('Archivo no compatible. Selecciona una imagen.', false);
      evidenceInput.value = '';
      evidencePreviewWrap.style.display = 'none';
      return;
    }
    if (f.size > max) {
      showMessage('El archivo supera 10 MB. Selecciona uno más pequeño.', false);
      evidenceInput.value = '';
      evidencePreviewWrap.style.display = 'none';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      evidencePreview.src = reader.result;
      evidencePreviewWrap.style.display = '';
      evidenceInput._dataUrl = reader.result;
      evidenceInput._file = f;
    };
    reader.readAsDataURL(f);
  });

  async function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('No se pudo leer el archivo'));
      r.readAsDataURL(file);
    });
  }

  async function sendToWebApp(payload) {
    if (!WEBAPP_URL) return { ok: false, msg: 'WEBAPP_URL no configurada' };
    try {
        const res = await fetch(WEBAPP_URL, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify(payload)
        });

      const text = await res.text();
      // Intentar parsear JSON; devolver un objeto con el status para diagnóstico
      try {
        const data = JSON.parse(text);
        return { ok: res.ok, status: res.status, statusText: res.statusText, data };
      } catch (e) {
        return { ok: res.ok, status: res.status, statusText: res.statusText, data: text };
      }
    } catch (err) {
      console.warn('Error enviando al WebApp:', err);
      return { ok: false, msg: String(err) };
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();

  // Validaciones
    if (!inputArea.value.trim()) { showMessage('Completa el área o módulo.', false); inputArea.focus(); return; }
    if (!inputUbic.value.trim()) { showMessage('Completa la ubicación específica.', false); inputUbic.focus(); return; }

    const categoria = getSelectedRadioValue(categoriaRadios);
    if (!categoria) { showMessage('Selecciona la categoría de la falla.', false); return; }
    let categoriaFinal = categoria;
    if (categoria === 'Otro') {
      if (!categoriaOtro.value.trim()) { showMessage('Especifica la categoría en "Otro".', false); categoriaOtro.focus(); return; }
      categoriaFinal = categoriaOtro.value.trim();
    }

    if (!descripcion.value.trim()) { showMessage('La descripción es obligatoria.', false); descripcion.focus(); return; }

    const impactsSelected = impactChecks.filter(c => c.checked).map(c => c.value);
    if (!impactsSelected.length) { showMessage('Selecciona cómo afecta el problema (o marca Ninguna).', false); return; }

    const file = evidenceInput.files && evidenceInput.files[0];
    if (!file) { showMessage('Adjunta una imagen como evidencia (≤10 MB).', false); evidenceInput.focus(); return; }
    if (!file.type.startsWith('image/')) { showMessage('El archivo debe ser una imagen.', false); return; }
    if (file.size > 10 * 1024 * 1024) { showMessage('El archivo supera 10 MB.', false); return; }

    const urg = getSelectedRadioValue(urgenciaRadios);
    if (!urg) { showMessage('Selecciona el nivel de urgencia.', false); return; }

    if (!form.consent.checked) { showMessage('Debes autorizar el registro para continuar.', false); form.consent.focus(); return; }

    // Construir payload. Incluimos dataUrl de la imagen.
    let dataUrl = evidenceInput._dataUrl || null;
    if (!dataUrl) {
      try { dataUrl = await readFileAsDataURL(file); } catch (e) { console.warn(e); }
    }

    const payload = {
      correo: inputCorreo.value.trim(),
      area: inputArea.value.trim(),
      ubicacion: inputUbic.value.trim(),
      categoria: categoriaFinal,
      descripcion: descripcion.value.trim(),
      impact: impactsSelected,
      urgencia: urg,
      created: new Date().toISOString(),
      evidence: {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: dataUrl // base64 data URL; el WebApp debe procesarlo
      }
    };

    showMessage('Enviando...', true, 10000);

    if (!WEBAPP_URL) {
      showMessage('WEBAPP_URL no está configurada. Pega la URL del WebApp en scripts.js para enviar.', false, 10000);
      return;
    }

    try {
      const res = await sendToWebApp(payload);
      console.log('WebApp response:', res);
      if (res.ok) {
        showMessage('Envío recibido. Gracias.', true);
        form.reset();
        evidencePreviewWrap.style.display = 'none';
      } else {
        // Construir un mensaje más informativo
        let errMsg = res.msg || (res.data && (res.data.msg || (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)))) || `HTTP ${res.status || ''} ${res.statusText || ''}`;
        showMessage('Error del servidor: ' + errMsg, false);
      }
    } catch (err) {
      showMessage('Error al enviar: ' + String(err), false);
    }
  });
});