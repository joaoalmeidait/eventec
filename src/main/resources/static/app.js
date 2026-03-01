const state = {
  page: 0,
  size: 9,
  events: [],
  hasFilters: false
};

const elements = {
  form: document.getElementById("filtersForm"),
  statusLine: document.getElementById("statusLine"),
  grid: document.getElementById("eventsGrid"),
  emptyState: document.getElementById("emptyState"),
  eventsCount: document.getElementById("eventsCount"),
  currentPage: document.getElementById("currentPage"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  clearFilters: document.getElementById("clearFilters"),
  searchEventId: document.getElementById("searchEventId"),
  searchByIdBtn: document.getElementById("searchByIdBtn"),
  openCreateModal: document.getElementById("openCreateModal"),
  detailsModal: document.getElementById("detailsModal"),
  modalBody: document.getElementById("modalBody"),
  modalTitle: document.getElementById("modalTitle"),
  closeModal: document.getElementById("closeModal"),
  createModal: document.getElementById("createModal"),
  closeCreateModal: document.getElementById("closeCreateModal"),
  createEventForm: document.getElementById("createEventForm"),
  toast: document.getElementById("toast"),
  createRemote: document.getElementById("createRemote"),
  createCity: document.getElementById("createCity"),
  createUf: document.getElementById("createUf")
};

let toastTimer = null;

function getApiUrl(path, params = {}) {
  const base = window.location.origin;
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_) {
    return { raw: text };
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.payload = data;
    throw error;
  }
  return data;
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Data nao informada";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function getCurrentFilters() {
  return {
    title: document.getElementById("title").value.trim(),
    city: document.getElementById("city").value.trim(),
    uf: document.getElementById("uf").value.trim(),
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value
  };
}

function hasAnyFilter(filters) {
  return Object.values(filters).some((value) => value !== "");
}

function renderEvents() {
  elements.eventsCount.textContent = String(state.events.length);
  elements.currentPage.textContent = String(state.page + 1);

  if (state.events.length === 0) {
    elements.grid.innerHTML = "";
    elements.emptyState.classList.remove("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.grid.innerHTML = state.events
    .map((event) => {
      const image = event.imgUrl
        ? `<img class="event-banner" src="${escapeHtml(event.imgUrl)}" alt="Imagem do evento ${escapeHtml(event.title)}">`
        : `<div class="event-banner"></div>`;
      const place = event.remote ? "Remoto" : `${event.city || "-"} - ${event.state || event.uf || "-"}`;
      const safeUrl = escapeHtml(event.eventUrl || "#");
      return `
        <article class="event-card">
          ${image}
          <div class="event-content">
            <h3>${escapeHtml(event.title)}</h3>
            <p class="meta">${escapeHtml(formatDate(event.date))}</p>
            <p class="meta">${escapeHtml(place)}</p>
            <div class="chips">
              <span class="chip ${event.remote ? "remote" : ""}">${event.remote ? "ONLINE" : "PRESENCIAL"}</span>
            </div>
            <div class="event-actions">
              <button type="button" data-details="${escapeHtml(event.id)}">Detalhes</button>
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                <button type="button" class="ghost">Site</button>
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-details]").forEach((button) => {
    button.addEventListener("click", () => openDetails(button.getAttribute("data-details")));
  });
}

function setStatus(message, isError = false) {
  elements.statusLine.textContent = message;
  elements.statusLine.style.color = isError ? "#9f1f1f" : "#345174";
}

function showToast(message, isError = false, durationMs = 2800) {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  elements.toast.classList.toggle("error", isError);

  // Force reflow for re-triggering transition between rapid toasts.
  void elements.toast.offsetWidth;
  elements.toast.classList.add("show");

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("show");
    setTimeout(() => {
      elements.toast.classList.add("hidden");
    }, 180);
  }, durationMs);
}

async function loadEvents() {
  setStatus("Carregando eventos...");
  try {
    const filters = getCurrentFilters();
    state.hasFilters = hasAnyFilter(filters);
    state.size = Number(document.getElementById("size").value) || 9;

    const params = {
      page: state.page,
      size: state.size
    };

    let url;
    if (state.hasFilters) {
      url = getApiUrl("/api/event/filter", { ...params, ...filters });
    } else {
      url = getApiUrl("/api/event", params);
    }

    const data = await request(url);
    state.events = Array.isArray(data) ? data : [];
    renderEvents();
    setStatus(`${state.events.length} evento(s) carregado(s).`);
  } catch (error) {
    state.events = [];
    renderEvents();
    setStatus("Falha ao carregar eventos. Verifique a API.", true);
    console.error(error);
  }
}

async function openDetails(eventId) {
  if (!eventId) {
    setStatus("Informe um ID de evento valido.", true);
    return;
  }
  try {
    const data = await request(getApiUrl(`/api/event/${eventId}`));
    elements.modalTitle.textContent = data.title || "Detalhes do evento";

    const coupons = Array.isArray(data.coupons) ? data.coupons : [];
    const couponMarkup = coupons.length
      ? `<ul class="coupon-list">${coupons
          .map(
            (coupon) =>
              `<li><strong>${escapeHtml(coupon.code)}</strong> - ${coupon.discount}% ate ${escapeHtml(
                formatDate(coupon.validUntil)
              )}</li>`
          )
          .join("")}</ul>`
      : "<p>Sem cupons ativos para este evento.</p>";

    const location = data.city && data.uf ? `${data.city} - ${data.uf}` : "Remoto";

    elements.modalBody.innerHTML = `
      <p><strong>Data:</strong> ${escapeHtml(formatDate(data.date))}</p>
      <p><strong>Local:</strong> ${escapeHtml(location)}</p>
      <p><strong>Descricao:</strong> ${escapeHtml(data.description || "Sem descricao.")}</p>
      <p><a href="${escapeHtml(data.eventUrl || "#")}" target="_blank" rel="noopener noreferrer">Abrir pagina do evento</a></p>
      <h4>Cupons</h4>
      ${couponMarkup}
    `;
    elements.detailsModal.showModal();
  } catch (error) {
    setStatus("Nao foi possivel buscar os detalhes do evento.", true);
    console.error(error);
  }
}

function toggleAddressInputs() {
  const isRemote = elements.createRemote.checked;
  elements.createCity.disabled = isRemote;
  elements.createUf.disabled = isRemote;
}

async function createEvent(event) {
  event.preventDefault();
  try {
    const timestamp = new Date(document.getElementById("createDate").value).getTime();
    if (Number.isNaN(timestamp)) {
      showToast("Data invalida para criacao do evento.", true);
      return;
    }

    const isRemote = elements.createRemote.checked;
    const formData = new FormData();
    formData.append("title", document.getElementById("createTitle").value.trim());
    formData.append("description", document.getElementById("createDescription").value.trim());
    formData.append("date", String(timestamp));
    formData.append("city", isRemote ? "" : elements.createCity.value.trim());
    formData.append("uf", isRemote ? "" : elements.createUf.value.trim());
    formData.append("remote", String(isRemote));
    formData.append("eventUrl", document.getElementById("createUrl").value.trim());

    const imageInput = document.getElementById("createImage");
    if (imageInput.files && imageInput.files[0]) {
      formData.append("image", imageInput.files[0]);
    }

    await request(getApiUrl("/api/event"), {
      method: "POST",
      body: formData
    });

    elements.createEventForm.reset();
    toggleAddressInputs();
    elements.createModal.close();
    showToast("Evento criado com sucesso.");
    state.page = 0;
    await loadEvents();
  } catch (error) {
    showToast("Falha ao criar evento. Revise os campos e tente novamente.", true, 3400);
    console.error(error);
  }
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.page = 0;
  await loadEvents();
});

elements.clearFilters.addEventListener("click", async () => {
  elements.form.reset();
  document.getElementById("size").value = "9";
  state.page = 0;
  await loadEvents();
});

elements.prevPage.addEventListener("click", async () => {
  if (state.page === 0) {
    return;
  }
  state.page -= 1;
  await loadEvents();
});

elements.nextPage.addEventListener("click", async () => {
  state.page += 1;
  await loadEvents();
});

elements.searchByIdBtn.addEventListener("click", async () => {
  const id = elements.searchEventId.value.trim();
  await openDetails(id);
});

elements.openCreateModal.addEventListener("click", () => {
  elements.createModal.showModal();
});

elements.closeModal.addEventListener("click", () => {
  elements.detailsModal.close();
});

elements.closeCreateModal.addEventListener("click", () => {
  elements.createModal.close();
});

elements.createRemote.addEventListener("change", toggleAddressInputs);
elements.createEventForm.addEventListener("submit", createEvent);

window.addEventListener("click", (event) => {
  if (event.target === elements.detailsModal) {
    elements.detailsModal.close();
  }
  if (event.target === elements.createModal) {
    elements.createModal.close();
  }
});

toggleAddressInputs();
loadEvents();
