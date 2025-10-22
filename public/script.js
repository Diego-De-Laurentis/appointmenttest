(() => {
  const KEY_SLOTS = 'ta_slots_v1';
  const KEY_APPTS = 'ta_appts_v1';

  function seedIfEmpty() {
    if (localStorage.getItem(KEY_SLOTS)) return;
    const times = ['09:00','11:00','14:00','16:00'];
    const out = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i=0;i<14;i++) {
      const day = new Date(today.getTime() + i*86400000);
      const dateStr = day.toISOString().slice(0,10);
      for (const t of times) {
        const [hh,mm] = t.split(':').map(Number);
        const start = new Date(dateStr+'T'+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':00.000Z');
        out.push({ id: out.length+1, start_iso: start.toISOString(), booked: false });
      }
    }
    localStorage.setItem(KEY_SLOTS, JSON.stringify(out));
    localStorage.setItem(KEY_APPTS, JSON.stringify([]));
  }

  function loadSlots() {
    try { return JSON.parse(localStorage.getItem(KEY_SLOTS) || '[]'); } catch { return []; }
  }
  function saveSlots(slots) { localStorage.setItem(KEY_SLOTS, JSON.stringify(slots)); }
  function loadAppts() {
    try { return JSON.parse(localStorage.getItem(KEY_APPTS) || '[]'); } catch { return []; }
  }
  function saveAppts(appts) { localStorage.setItem(KEY_APPTS, JSON.stringify(appts)); }

  function groupByDay(slots) {
    const out = {};
    const now = new Date();
    for (const s of slots) {
      const d = new Date(s.start_iso);
      if (d <= now) continue;
      if (s.booked) continue;
      const key = d.toISOString().slice(0,10);
      (out[key] ||= []).push({ id: s.id, start_iso: s.start_iso });
    }
    return out;
  }

  function renderGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    const term = (document.getElementById('search')?.value || '').trim().toLowerCase();
    const slots = loadSlots();
    const data = groupByDay(slots);
    grid.innerHTML = '';
    const days = Object.keys(data).sort();
    if (!days.length) {
      grid.innerHTML = '<p class="muted">No upcoming slots.</p>';
      return;
    }
    for (const day of days) {
      if (term && !day.includes(term)) {
        const any = data[day].some(s => new Date(s.start_iso).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}).toLowerCase().includes(term));
        if (!any) continue;
      }
      const col = document.createElement('div');
      col.className = 'day';
      const h = document.createElement('div');
      h.className = 'day-head';
      h.textContent = new Date(day+'T00:00:00Z').toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'});
      col.appendChild(h);
      const body = document.createElement('div');
      body.className = 'day-body';
      for (const s of data[day]) {
        const tlabel = new Date(s.start_iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const btn = document.createElement('button');
        btn.className = 'slot-block';
        btn.textContent = tlabel;
        btn.addEventListener('click', () => {
          location.href = `/terms.html?slot=${encodeURIComponent(s.id)}&start=${encodeURIComponent(s.start_iso)}`;
        });
        body.appendChild(btn);
      }
      col.appendChild(body);
      grid.appendChild(col);
    }
  }

  function initIndex() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('search').addEventListener('input', renderGrid);
    document.getElementById('reset').addEventListener('click', () => {
      localStorage.removeItem(KEY_SLOTS);
      localStorage.removeItem(KEY_APPTS);
      seedIfEmpty();
      renderGrid();
    });
    seedIfEmpty();
    renderGrid();
  }

  function initTerms() {
    const form = document.getElementById('details-form');
    if (!form) return;
    const params = new URLSearchParams(location.search);
    const slotId = Number(params.get('slot'));
    const start = params.get('start');
    document.querySelector('input[name="slotId"]').value = slotId;
    document.getElementById('slot-info').textContent = start ? `Selected time: ${new Date(start).toLocaleString()}` : '';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const slots = loadSlots();
      const slot = slots.find(s => s.id === Number(payload.slotId));
      const out = document.getElementById('status');
      if (!slot || slot.booked) { out.textContent = 'Slot not available.'; out.className='error'; return; }
      slot.booked = true;
      saveSlots(slots);
      const appts = loadAppts();
      appts.push({ slotId: slot.id, name: payload.name, email: payload.email, phone: payload.phone || '', ts: new Date().toISOString() });
      saveAppts(appts);
      out.textContent = 'Saved locally. Appointment booked.';
      out.className = 'success';
      setTimeout(() => { location.href = '/'; }, 800);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initIndex(); initTerms(); });
  } else {
    initIndex(); initTerms();
  }
})();
