/* ============================================================
   Salon Web — app.js
   Toda la lógica frontend (~950 líneas)
   ============================================================ */

const API_URL = 'https://api.westestudio.bar';
const KEY_TOKEN = 'salon_token';
const KEY_USER  = 'salon_user';
const WHATSAPP  = '595982389566';

/* ── Estado global ─────────────────────────────────────────── */
let categorias    = [];
let servicios     = [];
let packs         = [];
let profesionales = [];
let testimonios   = [];
let galeria       = [];

let adminPage     = 'dashboard';
let selectedRating = 5;
let adminCitas    = [];
let adminMensajes = [];
let adminTestimonios = [];
let adminGaleria  = [];

/* ── Utils ──────────────────────────────────────────────────── */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function formatPrecio(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-PY').format(n) + ' Gs.';
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = String(d).split('-');
  return `${day}/${m}/${y}`;
}

function formatDatetime(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-PY') + ' ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = 'default') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||icons.default}</span><span>${escapeHtml(msg)}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function token() { return localStorage.getItem(KEY_TOKEN); }
function isAdmin() { return !!token(); }

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token()) headers['Authorization'] = `Bearer ${token()}`;
  const res = await fetch(API_URL + path, { ...opts, headers });
  if (res.status === 401) { logout(); return null; }
  if (!res.ok) {
    let msg = 'Error en la solicitud';
    try { const e = await res.json(); msg = e.detail || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ── Auth ───────────────────────────────────────────────────── */
function logout() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  document.getElementById('public-site').style.display = '';
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('btn-admin-navbar').textContent = 'Admin';
  showToast('Sesión cerrada');
}

async function login(usuario, password) {
  const body = new URLSearchParams({ username: usuario, password });
  const res = await fetch(API_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || 'Credenciales incorrectas');
  }
  const data = await res.json();
  localStorage.setItem(KEY_TOKEN, data.access_token);
  localStorage.setItem(KEY_USER, data.nombre || usuario);
  return data;
}

/* ── Navigation ─────────────────────────────────────────────── */
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
  });

  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });

  document.querySelectorAll('.nav-scroll, #mobile-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.dataset.target;
      if (!target) return;
      e.preventDefault();
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });

  // active nav link on scroll
  const sections = ['inicio','servicios','reservar','galeria','nosotros','testimonios','contacto'];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        document.querySelectorAll('.nav-links a').forEach(a => {
          a.classList.toggle('active', a.dataset.target === en.target.id);
        });
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });

  // ESC closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
      document.getElementById('lightbox')?.classList.add('hidden');
    }
  });

  document.getElementById('btn-admin-navbar').addEventListener('click', () => {
    if (isAdmin()) { showAdminPanel(); } else { openLoginModal(); }
  });
}

/* ── Login Modal ────────────────────────────────────────────── */
function openLoginModal() {
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('login-usuario').focus();
}

function initLoginModal() {
  document.getElementById('login-modal-close').addEventListener('click', () => {
    document.getElementById('login-modal').classList.add('hidden');
  });
  document.getElementById('login-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('login-modal')) {
      document.getElementById('login-modal').classList.add('hidden');
    }
  });

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = 'Ingresando…';
    try {
      await login(
        document.getElementById('login-usuario').value.trim(),
        document.getElementById('login-password').value,
      );
      document.getElementById('login-modal').classList.add('hidden');
      showAdminPanel();
    } catch (err) {
      document.getElementById('login-error').textContent = err.message;
      document.getElementById('login-error').style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
  });

  document.getElementById('login-form').addEventListener('input', () => {
    document.getElementById('login-error').style.display = 'none';
  });
}

/* ── Public site loader ─────────────────────────────────────── */
async function loadPublicData() {
  try {
    [categorias, servicios, packs, profesionales, testimonios, galeria] = await Promise.all([
      apiFetch('/api/categorias'),
      apiFetch('/api/servicios'),
      apiFetch('/api/packs'),
      apiFetch('/api/profesionales'),
      apiFetch('/api/testimonios?solo_aprobados=true'),
      apiFetch('/api/galeria'),
    ]);
    renderServicios('todos');
    renderPacks();
    renderEquipo();
    renderTestimonios();
    renderGaleria();
    initFiltroServicios();
    initReservaForm();
  } catch (e) {
    console.error('Error cargando datos públicos:', e);
  }
}

/* ── Servicios section ──────────────────────────────────────── */
function initFiltroServicios() {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;
  bar.innerHTML = `
    <button class="filter-btn active" data-cat="todos" onclick="renderServicios('todos');setActiveFilter(this)">Todos</button>
    ${categorias.map(c => `
      <button class="filter-btn" data-cat="${c.id}" onclick="renderServicios(${c.id});setActiveFilter(this)">
        ${escapeHtml(c.icono)} ${escapeHtml(c.nombre)}
      </button>
    `).join('')}
  `;
}

window.setActiveFilter = function(btn) {
  document.querySelectorAll('#filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.renderServicios = function(catId) {
  const grid = document.getElementById('servicios-grid');
  if (!grid) return;
  const lista = catId === 'todos' ? servicios : servicios.filter(s => s.categoria_id === catId);
  if (!lista.length) {
    grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;grid-column:1/-1;padding:2rem">No hay servicios en esta categoría.</p>';
    return;
  }
  grid.innerHTML = lista.map(s => `
    <div class="servicio-card">
      <div class="servicio-cat">${escapeHtml(s.categoria_nombre || '')}</div>
      <div class="servicio-nombre">${escapeHtml(s.nombre)}</div>
      ${s.descripcion ? `<div class="servicio-desc">${escapeHtml(s.descripcion)}</div>` : ''}
      <div class="servicio-meta">
        <div class="servicio-precio">${s.precio != null ? formatPrecio(s.precio) : 'Consultar'}</div>
        ${s.duracion_min ? `<div class="servicio-duracion">⏱ ${s.duracion_min} min</div>` : ''}
      </div>
    </div>
  `).join('');
};

function renderPacks() {
  const grid = document.getElementById('packs-grid');
  if (!grid || !packs.length) {
    document.getElementById('packs-section')?.style && (document.getElementById('packs-section').style.display = 'none');
    return;
  }
  grid.innerHTML = packs.map(p => {
    const ahorro = p.precio_original ? Math.round((p.precio_original - p.precio) / p.precio_original * 100) : null;
    return `
      <div class="pack-card">
        ${ahorro ? `<div class="pack-badge-top">Ahorrás ${ahorro}%</div>` : ''}
        <div class="pack-nombre">${escapeHtml(p.nombre)}</div>
        ${p.descripcion ? `<div class="pack-desc">${escapeHtml(p.descripcion)}</div>` : ''}
        <div class="pack-precios">
          <div class="pack-precio-actual">${formatPrecio(p.precio)}</div>
          ${p.precio_original ? `<div class="pack-precio-original">${formatPrecio(p.precio_original)}</div>` : ''}
        </div>
        ${ahorro ? `<div class="pack-ahorro">✓ Ahorrás ${formatPrecio(p.precio_original - p.precio)}</div>` : ''}
        <button class="btn btn-primary btn-sm" style="margin-top:1rem;width:100%;justify-content:center"
          onclick="document.getElementById('reservar').scrollIntoView({behavior:'smooth'})">Reservar pack</button>
      </div>
    `;
  }).join('');
}

/* ── Galería section ────────────────────────────────────────── */
function renderGaleria() {
  const grid = document.getElementById('galeria-grid');
  if (!grid) return;
  if (!galeria.length) {
    grid.innerHTML = `
      ${[1,2,3,4,5,6].map(i => `
        <div class="galeria-item">
          <div class="galeria-placeholder">${['💅','✂️','✨','🦶','👁️','💇'][i-1]}</div>
        </div>
      `).join('')}
    `;
    return;
  }
  grid.innerHTML = galeria.map(img => `
    <div class="galeria-item" onclick="openLightbox('${escapeHtml(img.imagen_url)}')">
      <img src="${escapeHtml(img.imagen_url)}" alt="${escapeHtml(img.titulo||'')}" loading="lazy">
      <div class="galeria-item-overlay">🔍</div>
    </div>
  `).join('');
}

window.openLightbox = function(url) {
  const lb = document.getElementById('lightbox');
  lb.querySelector('img').src = url;
  lb.classList.remove('hidden');
};

/* ── Equipo section ─────────────────────────────────────────── */
function renderEquipo() {
  const grid = document.getElementById('equipo-grid');
  if (!grid) return;
  if (!profesionales.length) { grid.innerHTML = ''; return; }
  const emojis = ['💆','💇','✨','💅','👁️'];
  grid.innerHTML = profesionales.map((p, i) => `
    <div class="equipo-card">
      <div class="equipo-avatar">${p.foto_url
        ? `<img src="${escapeHtml(p.foto_url)}" alt="${escapeHtml(p.nombre)}" loading="lazy">`
        : emojis[i % emojis.length]}</div>
      <div class="equipo-nombre">${escapeHtml(p.nombre)}</div>
      ${p.especialidad ? `<div class="equipo-especialidad">${escapeHtml(p.especialidad)}</div>` : ''}
      ${p.bio ? `<div class="equipo-bio">${escapeHtml(p.bio)}</div>` : ''}
    </div>
  `).join('');
}

/* ── Testimonios section ────────────────────────────────────── */
function renderTestimonios() {
  const grid = document.getElementById('testimonios-grid');
  if (!grid) return;
  if (!testimonios.length) { grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">Sé el primero en dejar tu opinión.</p>'; return; }
  grid.innerHTML = testimonios.map(t => `
    <div class="testimonio-card">
      <div class="testimonio-stars">${'★'.repeat(t.calificacion)}${'☆'.repeat(5 - t.calificacion)}</div>
      <div class="testimonio-quote">${escapeHtml(t.texto)}</div>
      <div class="testimonio-autor">${escapeHtml(t.cliente_nombre)}</div>
    </div>
  `).join('');
}

/* ── Rating stars ───────────────────────────────────────────── */
function initRatingStars() {
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val);
      updateStars();
    });
  });
}

function updateStars() {
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.val) <= selectedRating);
  });
}

/* ── Reserva Form ───────────────────────────────────────────── */
function initReservaForm() {
  const selServicio = document.getElementById('reserva-servicio');
  const selPack     = document.getElementById('reserva-pack');
  const selProf     = document.getElementById('reserva-profesional');

  if (selServicio) {
    selServicio.innerHTML = '<option value="">— Seleccionar servicio —</option>' +
      servicios.map(s => `<option value="${s.id}">${escapeHtml(s.nombre)} ${s.duracion_min ? `(${s.duracion_min} min)` : ''}</option>`).join('');
  }
  if (selPack) {
    selPack.innerHTML = '<option value="">— O elegir un pack —</option>' +
      packs.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} — ${formatPrecio(p.precio)}</option>`).join('');
  }
  if (selProf) {
    selProf.innerHTML = '<option value="">Sin preferencia</option>' +
      profesionales.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
  }

  // set min date to today
  const inputFecha = document.getElementById('reserva-fecha');
  if (inputFecha) {
    const hoy = new Date();
    inputFecha.min = hoy.toISOString().split('T')[0];
    inputFecha.value = '';
  }

  document.getElementById('reserva-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-reservar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    try {
      const payload = {
        nombre:         document.getElementById('reserva-nombre').value.trim(),
        telefono:       document.getElementById('reserva-telefono').value.trim(),
        email:          document.getElementById('reserva-email').value.trim() || null,
        servicio_id:    parseInt(document.getElementById('reserva-servicio').value) || null,
        pack_id:        parseInt(document.getElementById('reserva-pack').value) || null,
        profesional_id: parseInt(document.getElementById('reserva-profesional').value) || null,
        fecha:          document.getElementById('reserva-fecha').value,
        hora:           document.getElementById('reserva-hora').value,
        nota:           document.getElementById('reserva-nota').value.trim() || null,
      };
      if (!payload.servicio_id && !payload.pack_id) {
        showToast('Seleccioná un servicio o un pack', 'warning');
        return;
      }
      await apiFetch('/api/citas', { method: 'POST', body: JSON.stringify(payload) });
      showToast('¡Cita solicitada con éxito! Te contactaremos para confirmar.', 'success');
      document.getElementById('reserva-form').reset();
      // WhatsApp confirmation
      const msg = encodeURIComponent(
        `Hola! Quiero confirmar mi cita para el ${formatDate(payload.fecha)} a las ${payload.hora}. Mi nombre es ${payload.nombre}.`
      );
      setTimeout(() => {
        if (confirm('¿Querés confirmar tu cita por WhatsApp?')) {
          window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank');
        }
      }, 1000);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Solicitar cita';
    }
  });
}

/* ── Contacto Form ──────────────────────────────────────────── */
function initContactoForm() {
  document.getElementById('contacto-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-contacto');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    try {
      await apiFetch('/api/contacto', {
        method: 'POST',
        body: JSON.stringify({
          nombre:  document.getElementById('contacto-nombre').value.trim(),
          email:   document.getElementById('contacto-email').value.trim() || null,
          telefono:document.getElementById('contacto-telefono').value.trim() || null,
          mensaje: document.getElementById('contacto-mensaje').value.trim(),
        }),
      });
      showToast('Mensaje enviado. Te responderemos a la brevedad.', 'success');
      document.getElementById('contacto-form').reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar mensaje';
    }
  });
}

/* ── Testimonio Form ────────────────────────────────────────── */
function initTestimonioForm() {
  initRatingStars();
  updateStars();
  document.getElementById('testimonio-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-testimonio');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    try {
      await apiFetch('/api/testimonios', {
        method: 'POST',
        body: JSON.stringify({
          cliente_nombre: document.getElementById('t-nombre').value.trim(),
          texto:          document.getElementById('t-texto').value.trim(),
          calificacion:   selectedRating,
        }),
      });
      showToast('¡Gracias por tu opinión! Será revisada antes de publicarse.', 'success');
      document.getElementById('testimonio-form').reset();
      selectedRating = 5;
      updateStars();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar opinión';
    }
  });
}

/* ── Admin Panel ────────────────────────────────────────────── */
async function showAdminPanel() {
  document.getElementById('public-site').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'flex';
  const user = localStorage.getItem(KEY_USER) || 'Admin';
  document.getElementById('admin-user-name').textContent = user;
  document.getElementById('btn-admin-navbar').textContent = user;
  await loadAdminPage('dashboard');
}

async function loadAdminPage(page) {
  adminPage = page;
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`admin-${page}`)?.classList.add('active');
  document.querySelector(`.sidebar-item[data-page="${page}"]`)?.classList.add('active');

  try {
    switch (page) {
      case 'dashboard':   await loadDashboard(); break;
      case 'citas':       await loadAdminCitas(); break;
      case 'servicios':   await loadAdminServicios(); break;
      case 'packs':       await loadAdminPacks(); break;
      case 'galeria':     await loadAdminGaleria(); break;
      case 'testimonios': await loadAdminTestimonios(); break;
      case 'mensajes':    await loadAdminMensajes(); break;
      case 'profesionales': await loadAdminProfesionales(); break;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadDashboard() {
  const stats = await apiFetch('/api/stats');
  if (!stats) return;
  document.getElementById('stat-citas-hoy').textContent = stats.citas_hoy;
  document.getElementById('stat-pendientes').textContent = stats.citas_pendientes;
  document.getElementById('stat-mensajes').textContent = stats.mensajes_nuevos;
  document.getElementById('stat-clientes').textContent = stats.total_clientes;
  if (stats.mensajes_nuevos > 0) {
    document.getElementById('mensajes-badge').textContent = stats.mensajes_nuevos;
    document.getElementById('mensajes-badge').style.display = 'inline';
  }
  const citas = await apiFetch('/api/citas?estado=pendiente');
  if (citas) renderDashboardCitas(citas.slice(0, 8));
}

function renderDashboardCitas(citas) {
  const tbody = document.getElementById('dashboard-citas-tbody');
  if (!tbody) return;
  if (!citas.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:1.5rem">No hay citas pendientes</td></tr>'; return; }
  tbody.innerHTML = citas.map(c => `
    <tr>
      <td>${formatDate(c.fecha)} ${c.hora}</td>
      <td>${escapeHtml(c.cliente_nombre||'—')}</td>
      <td>${escapeHtml(c.cliente_telefono||'—')}</td>
      <td>${escapeHtml(c.servicio_nombre || c.pack_nombre || '—')}</td>
      <td><span class="chip chip-${c.estado}">${c.estado}</span></td>
    </tr>
  `).join('');
}

/* ─ Citas admin ────────────────────────────────────────────── */
async function loadAdminCitas() {
  adminCitas = await apiFetch('/api/citas') || [];
  renderAdminCitas();
}

function renderAdminCitas() {
  const tbody = document.getElementById('citas-tbody');
  if (!tbody) return;
  if (!adminCitas.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-secondary)">No hay citas registradas</td></tr>';
    return;
  }
  tbody.innerHTML = adminCitas.map(c => `
    <tr>
      <td>${formatDate(c.fecha)}</td>
      <td>${escapeHtml(c.hora)}</td>
      <td>${escapeHtml(c.cliente_nombre||'—')}<br><small style="color:var(--text-secondary)">${escapeHtml(c.cliente_telefono||'')}</small></td>
      <td>${escapeHtml(c.servicio_nombre || c.pack_nombre || '—')}</td>
      <td>${escapeHtml(c.profesional_nombre||'—')}</td>
      <td><span class="chip chip-${c.estado}">${c.estado}</span></td>
      <td>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
          ${c.estado === 'pendiente' ? `<button class="btn btn-sm" style="background:#D1FAE5;color:#065F46;border:none;cursor:pointer" onclick="cambiarEstadoCita(${c.id},'confirmada')">✓ Confirmar</button>` : ''}
          ${c.estado === 'confirmada' ? `<button class="btn btn-sm" style="background:#E0E7FF;color:#3730A3;border:none;cursor:pointer" onclick="cambiarEstadoCita(${c.id},'completada')">✓ Completada</button>` : ''}
          ${c.cliente_telefono ? `<a href="https://wa.me/${escapeHtml(c.cliente_telefono.replace(/\D/g,''))}" target="_blank" class="btn btn-sm" style="background:#D1FAE5;color:#065F46;border:none;text-decoration:none">📱</a>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteCita(${c.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.cambiarEstadoCita = async function(id, estado) {
  try {
    await apiFetch(`/api/citas/${id}`, { method: 'PUT', body: JSON.stringify({ estado }) });
    showToast(`Cita ${estado}`, 'success');
    await loadAdminCitas();
  } catch (err) { showToast(err.message, 'error'); }
};

window.deleteCita = async function(id) {
  if (!confirm('¿Eliminar esta cita?')) return;
  try {
    await apiFetch(`/api/citas/${id}`, { method: 'DELETE' });
    showToast('Cita eliminada', 'success');
    await loadAdminCitas();
  } catch (err) { showToast(err.message, 'error'); }
};

/* ─ Servicios admin ─────────────────────────────────────────── */
async function loadAdminServicios() {
  const [cats, svcs] = await Promise.all([
    apiFetch('/api/categorias'),
    apiFetch('/api/servicios?solo_activos=false'),
  ]);
  categorias = cats || [];
  const tbody = document.getElementById('servicios-tbody');
  if (!tbody) return;
  const lista = svcs || [];
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-secondary)">No hay servicios</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(s => `
    <tr>
      <td>${escapeHtml(s.categoria_nombre||'—')}</td>
      <td><strong>${escapeHtml(s.nombre)}</strong>${s.descripcion ? `<br><small style="color:var(--text-secondary)">${escapeHtml(s.descripcion.substring(0,50))}…</small>` : ''}</td>
      <td>${s.duracion_min ? s.duracion_min + ' min' : '—'}</td>
      <td>${s.precio != null ? formatPrecio(s.precio) : '—'}</td>
      <td><span class="chip ${s.activo ? 'chip-activo' : 'chip-inactivo'}">${s.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-sm btn-ghost" onclick="editServicio(${s.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteServicio(${s.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.editServicio = async function(id) {
  const svcs = await apiFetch('/api/servicios?solo_activos=false');
  const s = svcs?.find(x => x.id === id);
  if (!s) return;
  openServicioModal(s);
};

window.deleteServicio = async function(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  try {
    await apiFetch(`/api/servicios/${id}`, { method: 'DELETE' });
    showToast('Servicio eliminado', 'success');
    await loadAdminServicios();
  } catch (err) { showToast(err.message, 'error'); }
};

function openServicioModal(s = null) {
  const modal = document.getElementById('servicio-modal');
  document.getElementById('servicio-modal-title').textContent = s ? 'Editar servicio' : 'Nuevo servicio';
  document.getElementById('servicio-id').value = s?.id || '';
  document.getElementById('servicio-nombre').value = s?.nombre || '';
  document.getElementById('servicio-descripcion').value = s?.descripcion || '';
  document.getElementById('servicio-duracion').value = s?.duracion_min || '';
  document.getElementById('servicio-precio').value = s?.precio || '';
  document.getElementById('servicio-activo').checked = s ? s.activo : true;

  const sel = document.getElementById('servicio-categoria');
  sel.innerHTML = '<option value="">Sin categoría</option>' +
    categorias.map(c => `<option value="${c.id}" ${s?.categoria_id === c.id ? 'selected' : ''}>${escapeHtml(c.icono)} ${escapeHtml(c.nombre)}</option>`).join('');

  modal.classList.remove('hidden');
}

function initServicioModal() {
  document.getElementById('servicio-modal-close')?.addEventListener('click', () =>
    document.getElementById('servicio-modal').classList.add('hidden'));

  document.getElementById('servicio-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('servicio-id').value;
    const payload = {
      nombre:      document.getElementById('servicio-nombre').value.trim(),
      descripcion: document.getElementById('servicio-descripcion').value.trim() || null,
      duracion_min:parseInt(document.getElementById('servicio-duracion').value) || null,
      precio:      parseFloat(document.getElementById('servicio-precio').value) || null,
      categoria_id:parseInt(document.getElementById('servicio-categoria').value) || null,
      activo:      document.getElementById('servicio-activo').checked,
    };
    try {
      const method = id ? 'PUT' : 'POST';
      const path   = id ? `/api/servicios/${id}` : '/api/servicios';
      await apiFetch(path, { method, body: JSON.stringify(payload) });
      showToast(id ? 'Servicio actualizado' : 'Servicio creado', 'success');
      document.getElementById('servicio-modal').classList.add('hidden');
      await loadAdminServicios();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

/* ─ Packs admin ─────────────────────────────────────────────── */
async function loadAdminPacks() {
  const lista = await apiFetch('/api/packs') || [];
  const tbody = document.getElementById('packs-tbody');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary)">No hay packs</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.nombre)}</strong>${p.descripcion ? `<br><small style="color:var(--text-secondary)">${escapeHtml(p.descripcion.substring(0,60))}</small>` : ''}</td>
      <td>${formatPrecio(p.precio)}</td>
      <td>${p.precio_original ? formatPrecio(p.precio_original) : '—'}</td>
      <td>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-sm btn-ghost" onclick="editPack(${p.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deletePack(${p.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.editPack = async function(id) {
  const lista = await apiFetch('/api/packs');
  const p = lista?.find(x => x.id === id);
  if (!p) return;
  openPackModal(p);
};

window.deletePack = async function(id) {
  if (!confirm('¿Eliminar este pack?')) return;
  try {
    await apiFetch(`/api/packs/${id}`, { method: 'DELETE' });
    showToast('Pack eliminado', 'success');
    await loadAdminPacks();
  } catch (err) { showToast(err.message, 'error'); }
};

function openPackModal(p = null) {
  const modal = document.getElementById('pack-modal');
  document.getElementById('pack-modal-title').textContent = p ? 'Editar pack' : 'Nuevo pack';
  document.getElementById('pack-id').value = p?.id || '';
  document.getElementById('pack-nombre').value = p?.nombre || '';
  document.getElementById('pack-descripcion').value = p?.descripcion || '';
  document.getElementById('pack-precio').value = p?.precio || '';
  document.getElementById('pack-precio-original').value = p?.precio_original || '';
  modal.classList.remove('hidden');
}

function initPackModal() {
  document.getElementById('pack-modal-close')?.addEventListener('click', () =>
    document.getElementById('pack-modal').classList.add('hidden'));

  document.getElementById('pack-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('pack-id').value;
    const payload = {
      nombre:          document.getElementById('pack-nombre').value.trim(),
      descripcion:     document.getElementById('pack-descripcion').value.trim() || null,
      precio:          parseFloat(document.getElementById('pack-precio').value),
      precio_original: parseFloat(document.getElementById('pack-precio-original').value) || null,
      activo: true,
    };
    try {
      const method = id ? 'PUT' : 'POST';
      const path   = id ? `/api/packs/${id}` : '/api/packs';
      await apiFetch(path, { method, body: JSON.stringify(payload) });
      showToast(id ? 'Pack actualizado' : 'Pack creado', 'success');
      document.getElementById('pack-modal').classList.add('hidden');
      await loadAdminPacks();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

/* ─ Galería admin ───────────────────────────────────────────── */
async function loadAdminGaleria() {
  adminGaleria = await apiFetch('/api/galeria') || [];
  const grid = document.getElementById('admin-galeria-grid');
  if (!grid) return;
  if (!adminGaleria.length) {
    grid.innerHTML = '<p style="color:var(--text-secondary);padding:1rem">Sin imágenes. Añadí la primera.</p>';
    return;
  }
  grid.innerHTML = adminGaleria.map(img => `
    <div style="position:relative;border-radius:var(--radius-sm);overflow:hidden;aspect-ratio:1;background:var(--border)">
      <img src="${escapeHtml(img.imagen_url)}" alt="" style="width:100%;height:100%;object-fit:cover">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:0;transition:.2s;display:flex;align-items:center;justify-content:center;gap:.5rem"
           onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
        <button class="btn btn-sm btn-danger" onclick="deleteGaleriaItem(${img.id})">🗑</button>
      </div>
      ${img.titulo ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:#fff;font-size:.72rem;padding:.3rem .5rem">${escapeHtml(img.titulo)}</div>` : ''}
    </div>
  `).join('');
}

window.deleteGaleriaItem = async function(id) {
  if (!confirm('¿Eliminar esta imagen?')) return;
  try {
    await apiFetch(`/api/galeria/${id}`, { method: 'DELETE' });
    showToast('Imagen eliminada', 'success');
    await loadAdminGaleria();
  } catch (err) { showToast(err.message, 'error'); }
};

/* Optimiza una imagen en el navegador: redimensiona y comprime a JPEG.
   Devuelve un data URL listo para guardar. */
function optimizeImage(file, maxDim = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function initGaleriaModal() {
  document.getElementById('galeria-modal-close')?.addEventListener('click', () =>
    document.getElementById('galeria-modal').classList.add('hidden'));

  document.getElementById('galeria-file')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await optimizeImage(file);
      document.getElementById('galeria-url').value = dataUrl;
      document.getElementById('galeria-preview').src = dataUrl;
      document.getElementById('galeria-preview-wrap').style.display = '';
      const kb = Math.round(dataUrl.length * 0.75 / 1024);
      document.getElementById('galeria-size-info').textContent = `Optimizada: ~${kb} KB`;
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('galeria-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const imagen = document.getElementById('galeria-url').value;
    if (!imagen) { showToast('Seleccioná una imagen', 'warning'); return; }
    const payload = {
      imagen_url: imagen,
      titulo:     document.getElementById('galeria-titulo').value.trim() || null,
      categoria:  document.getElementById('galeria-categoria').value.trim() || null,
      orden:      parseInt(document.getElementById('galeria-orden').value) || 0,
      activo:     true,
    };
    try {
      await apiFetch('/api/galeria', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Imagen agregada', 'success');
      document.getElementById('galeria-modal').classList.add('hidden');
      document.getElementById('galeria-form').reset();
      document.getElementById('galeria-preview-wrap').style.display = 'none';
      document.getElementById('galeria-url').value = '';
      await loadAdminGaleria();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

/* ─ Testimonios admin ───────────────────────────────────────── */
async function loadAdminTestimonios() {
  adminTestimonios = await apiFetch('/api/testimonios?solo_aprobados=false') || [];
  const tbody = document.getElementById('testimonios-tbody');
  if (!tbody) return;
  if (!adminTestimonios.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-secondary)">No hay testimonios</td></tr>';
    return;
  }
  tbody.innerHTML = adminTestimonios.map(t => `
    <tr>
      <td>${escapeHtml(t.cliente_nombre)}</td>
      <td style="max-width:260px;font-size:.82rem;color:var(--text-secondary)">${escapeHtml(t.texto.substring(0,100))}${t.texto.length > 100 ? '…' : ''}</td>
      <td>${'★'.repeat(t.calificacion)}</td>
      <td><span class="chip ${t.aprobado ? 'chip-aprobado' : 'chip-pendiente'}">${t.aprobado ? 'Publicado' : 'Pendiente'}</span></td>
      <td>
        <div style="display:flex;gap:.4rem">
          ${!t.aprobado ? `<button class="btn btn-sm" style="background:#D1FAE5;color:#065F46;border:none;cursor:pointer" onclick="aprobarTestimonio(${t.id},true)">✓ Publicar</button>` : `<button class="btn btn-sm btn-ghost" onclick="aprobarTestimonio(${t.id},false)">Despublicar</button>`}
          <button class="btn btn-sm btn-danger" onclick="deleteTestimonio(${t.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.aprobarTestimonio = async function(id, aprobado) {
  try {
    await apiFetch(`/api/testimonios/${id}`, { method: 'PUT', body: JSON.stringify({ aprobado }) });
    showToast(aprobado ? 'Testimonio publicado' : 'Testimonio ocultado', 'success');
    await loadAdminTestimonios();
  } catch (err) { showToast(err.message, 'error'); }
};

window.deleteTestimonio = async function(id) {
  if (!confirm('¿Eliminar este testimonio?')) return;
  try {
    await apiFetch(`/api/testimonios/${id}`, { method: 'DELETE' });
    showToast('Testimonio eliminado', 'success');
    await loadAdminTestimonios();
  } catch (err) { showToast(err.message, 'error'); }
};

/* ─ Mensajes admin ──────────────────────────────────────────── */
async function loadAdminMensajes() {
  adminMensajes = await apiFetch('/api/contacto') || [];
  const tbody = document.getElementById('mensajes-tbody');
  if (!tbody) return;
  if (!adminMensajes.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--text-secondary)">No hay mensajes</td></tr>';
    return;
  }
  tbody.innerHTML = adminMensajes.map(m => `
    <tr style="${!m.leido ? 'font-weight:600' : ''}">
      <td>${formatDatetime(m.creado_en)}</td>
      <td>${escapeHtml(m.nombre)}</td>
      <td>${escapeHtml(m.telefono||m.email||'—')}</td>
      <td style="max-width:260px;font-size:.82rem">${escapeHtml(m.mensaje.substring(0,100))}${m.mensaje.length>100?'…':''}</td>
      <td>
        <div style="display:flex;gap:.4rem">
          ${!m.leido ? `<button class="btn btn-sm btn-ghost" onclick="marcarLeido(${m.id})">✓ Leído</button>` : ''}
          ${m.telefono ? `<a href="https://wa.me/${escapeHtml(m.telefono.replace(/\D/g,''))}" target="_blank" class="btn btn-sm" style="background:#D1FAE5;color:#065F46;border:none;text-decoration:none">📱 WA</a>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteMensaje(${m.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.marcarLeido = async function(id) {
  try {
    await apiFetch(`/api/contacto/${id}/leer`, { method: 'PUT' });
    await loadAdminMensajes();
    await loadDashboard();
  } catch (err) { showToast(err.message, 'error'); }
};

window.deleteMensaje = async function(id) {
  if (!confirm('¿Eliminar este mensaje?')) return;
  try {
    await apiFetch(`/api/contacto/${id}`, { method: 'DELETE' });
    showToast('Mensaje eliminado', 'success');
    await loadAdminMensajes();
  } catch (err) { showToast(err.message, 'error'); }
};

/* ─ Profesionales admin ─────────────────────────────────────── */
async function loadAdminProfesionales() {
  const lista = await apiFetch('/api/profesionales') || [];
  const tbody = document.getElementById('profesionales-tbody');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-secondary)">No hay profesionales</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.6rem">
          ${p.foto_url
            ? `<img src="${escapeHtml(p.foto_url)}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover">`
            : `<span style="width:38px;height:38px;border-radius:50%;background:var(--primary-ultra);display:inline-flex;align-items:center;justify-content:center">👤</span>`}
          <strong>${escapeHtml(p.nombre)}</strong>
        </div>
      </td>
      <td>${escapeHtml(p.especialidad||'—')}</td>
      <td style="max-width:200px;font-size:.82rem;color:var(--text-secondary)">${escapeHtml(p.bio||'—')}</td>
      <td>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-sm btn-ghost" onclick="editProfesional(${p.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProfesional(${p.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.editProfesional = async function(id) {
  const lista = await apiFetch('/api/profesionales');
  const p = lista?.find(x => x.id === id);
  if (!p) return;
  openProfesionalModal(p);
};

window.deleteProfesional = async function(id) {
  if (!confirm('¿Eliminar este profesional?')) return;
  try {
    await apiFetch(`/api/profesionales/${id}`, { method: 'DELETE' });
    showToast('Profesional eliminado', 'success');
    await loadAdminProfesionales();
  } catch (err) { showToast(err.message, 'error'); }
};

function openProfesionalModal(p = null) {
  const modal = document.getElementById('profesional-modal');
  document.getElementById('prof-modal-title').textContent = p ? 'Editar profesional' : 'Nuevo profesional';
  document.getElementById('prof-id').value = p?.id || '';
  document.getElementById('prof-nombre').value = p?.nombre || '';
  document.getElementById('prof-especialidad').value = p?.especialidad || '';
  document.getElementById('prof-bio').value = p?.bio || '';
  document.getElementById('prof-file').value = '';
  document.getElementById('prof-foto').value = p?.foto_url || '';
  const wrap = document.getElementById('prof-preview-wrap');
  if (p?.foto_url) {
    document.getElementById('prof-preview').src = p.foto_url;
    document.getElementById('prof-size-info').textContent = '';
    wrap.style.display = '';
  } else {
    wrap.style.display = 'none';
  }
  modal.classList.remove('hidden');
}

function initProfesionalModal() {
  document.getElementById('prof-modal-close')?.addEventListener('click', () =>
    document.getElementById('profesional-modal').classList.add('hidden'));

  document.getElementById('prof-file')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await optimizeImage(file, 600, 0.75);
      document.getElementById('prof-foto').value = dataUrl;
      document.getElementById('prof-preview').src = dataUrl;
      document.getElementById('prof-preview-wrap').style.display = '';
      const kb = Math.round(dataUrl.length * 0.75 / 1024);
      document.getElementById('prof-size-info').textContent = `Optimizada: ~${kb} KB`;
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('prof-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('prof-id').value;
    const payload = {
      nombre:      document.getElementById('prof-nombre').value.trim(),
      especialidad:document.getElementById('prof-especialidad').value.trim() || null,
      bio:         document.getElementById('prof-bio').value.trim() || null,
      foto_url:    document.getElementById('prof-foto').value || null,
      activo: true,
    };
    try {
      const method = id ? 'PUT' : 'POST';
      const path   = id ? `/api/profesionales/${id}` : '/api/profesionales';
      await apiFetch(path, { method, body: JSON.stringify(payload) });
      showToast(id ? 'Profesional actualizado' : 'Profesional creado', 'success');
      document.getElementById('profesional-modal').classList.add('hidden');
      await loadAdminProfesionales();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

/* ── Bootstrap ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initLoginModal();
  initContactoForm();
  initTestimonioForm();
  initServicioModal();
  initPackModal();
  initGaleriaModal();
  initProfesionalModal();

  // Sidebar navigation
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => loadAdminPage(item.dataset.page));
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', logout);

  // Lightbox close
  document.getElementById('lightbox-close')?.addEventListener('click', () =>
    document.getElementById('lightbox').classList.add('hidden'));
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox'))
      document.getElementById('lightbox').classList.add('hidden');
  });

  // WhatsApp float
  document.getElementById('whatsapp-float')?.addEventListener('click', () =>
    window.open(`https://wa.me/${WHATSAPP}`, '_blank'));

  // Admin modal close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
  });

  // New buttons in admin
  document.getElementById('btn-new-servicio')?.addEventListener('click', () => openServicioModal());
  document.getElementById('btn-new-pack')?.addEventListener('click', () => openPackModal());
  document.getElementById('btn-new-galeria')?.addEventListener('click', () =>
    document.getElementById('galeria-modal').classList.remove('hidden'));
  document.getElementById('btn-new-profesional')?.addEventListener('click', () => openProfesionalModal());

  // Load public data
  loadPublicData();

  // If already logged in, show admin directly
  if (isAdmin()) showAdminPanel();
});
