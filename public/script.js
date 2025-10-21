async function fetchSlots() {
  const r = await fetch('/api/slots');
  return r.json();
}

function renderSlots(slots) {
  const ul = document.getElementById('slot-list');
  ul.innerHTML = '';
  for (const s of slots) {
    const li = document.createElement('li');
    li.className = 'slot';
    const label = new Date(s.start_iso).toLocaleString();
    li.innerHTML = `<button class="slot-btn" data-id="${s.id}" data-start="${s.start_iso}">${label}</button>`;
    ul.appendChild(li);
  }
}

function filterSlots(term) {
  const items = [...document.querySelectorAll('#slot-list .slot-btn')];
  const q = term.toLowerCase();
  for (const b of items) {
    const show = b.textContent.toLowerCase().includes(q);
    b.parentElement.style.display = show ? '' : 'none';
  }
}

async function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  const btn = document.getElementById('open-picker');
  const dropdown = document.getElementById('dropdown');
  btn.addEventListener('click', async () => {
    dropdown.classList.toggle('hidden');
    if (!dropdown.dataset.loaded) {
      const slots = await fetchSlots();
      renderSlots(slots);
      dropdown.dataset.loaded = '1';
    }
  });

  document.getElementById('search').addEventListener('input', (e) => filterSlots(e.target.value));

  document.getElementById('slot-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('slot-btn')) {
      const id = e.target.dataset.id;
      const start = e.target.dataset.start;
      location.href = `/terms.html?slot=${encodeURIComponent(id)}&start=${encodeURIComponent(start)}`;
    }
  });
}

init();
