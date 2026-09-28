(() => {
  "use strict";

  const config = window.STUDY_SPOT_CONFIG;
  const state = { map: null, pins: [], markers: new Map(), selectedPin: null, isAdding: false, searchElement: null, infoWindow: null, previewUrl: null };
  const elements = {};
  const fallbackImages = ["assets/cafe6.jpg", "assets/cafe1.jpg", "assets/cafe2.jpg"];

  document.addEventListener("DOMContentLoaded", () => { cacheElements(); bindEvents(); loadPins(); loadGoogleMaps(); });
  window.initStudySpotMap = initStudySpotMap;

  function cacheElements() {
    ["api-status", "pin-count", "map", "search-mount", "locate-button", "add-spot-button", "explore-button", "empty-add-button", "empty-state", "spot-view", "spot-editor", "close-view-button", "cancel-editor-button", "cancel-form-button", "spot-form", "editor-eyebrow", "editor-title", "pin-id", "cafe-name", "address-display", "latitude", "longitude", "rating", "emoji", "note", "photo", "clear-photo-button", "selected-photo-preview", "photo-key", "location-summary", "save-button", "form-error", "view-title", "view-address", "view-rating", "view-tags", "view-note", "view-photo-status", "view-photo", "view-photo-fallback", "edit-button", "delete-button", "spot-list", "list-count", "toast"].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  function bindEvents() {
    document.querySelector(".brand")?.addEventListener("click", (e) => { e.preventDefault(); window.location.href = window.location.pathname; });
    elements["add-spot-button"].addEventListener("click", () => beginAddSpot());
    elements["empty-add-button"].addEventListener("click", () => beginAddSpot());
    elements["explore-button"].addEventListener("click", () => document.getElementById("discover").scrollIntoView({ behavior: "smooth", block: "start" }));
    elements["locate-button"].addEventListener("click", resetMapView);
    elements["close-view-button"].addEventListener("click", showEmptyState);
    elements["cancel-editor-button"].addEventListener("click", showEmptyState);
    elements["cancel-form-button"].addEventListener("click", showEmptyState);
    elements["edit-button"].addEventListener("click", async () => state.selectedPin && (await openEditor(state.selectedPin)));
    elements["delete-button"].addEventListener("click", deleteSelectedPin);
    elements["photo"].addEventListener("change", updatePhotoSelectionState);
    elements["clear-photo-button"].addEventListener("click", clearPhotoSelection);
    elements["spot-form"].addEventListener("submit", savePin);
  }

  function loadGoogleMaps() {
    const key = config.googleMapsApiKey || "";
    if (!key || key.includes("PASTE_YOUR")) return showMapMessage("Add your Google Maps key", "Paste the restricted browser key into config.js.");
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key, libraries: "places", callback: "initStudySpotMap", loading: "async", v: "weekly" })}`;
    script.async = true; script.defer = true;
    script.onerror = () => showMapMessage("Google Maps could not load", "Check the key restrictions and enabled APIs.");
    document.head.appendChild(script);
  }

  async function initStudySpotMap() {
    try {
      const { Map } = await google.maps.importLibrary("maps");
      state.map = new Map(elements.map, { center: config.defaultCenter, zoom: config.defaultZoom, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false, gestureHandling: "greedy" });
      state.infoWindow = new google.maps.InfoWindow();
      state.map.addListener("click", (event) => { if (state.isAdding && event.latLng) setEditorLocation(event.latLng.lat(), event.latLng.lng(), "Map location selected"); });
      await setupPlaceSearch();
      renderMarkers();
    } catch (error) { console.error(error); showMapMessage("Google Maps setup needs attention", error.message || "Check your API key and enabled APIs."); }
  }

  async function setupPlaceSearch() {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
    const autocomplete = new PlaceAutocompleteElement();
    autocomplete.placeholder = "Search a café or address";
    autocomplete.className = "google-search";
    elements["search-mount"].replaceChildren(autocomplete);
    state.searchElement = autocomplete;
    autocomplete.addEventListener("gmp-select", async ({ placePrediction }) => {
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
        if (!place.location) return;
        const lat = place.location.lat(); const lng = place.location.lng();
        state.map.panTo({ lat, lng }); state.map.setZoom(16);
        beginAddSpot({ cafeName: place.displayName || "", address: place.formattedAddress || "", lat, lng });
        showToast("Location selected. Add a rating and save the pin.");
      } catch (error) { showToast(error.message || "That place could not be selected.", "error"); }
    });
  }

  async function loadPins() {
    updateStatus("loading", "Loading spots…");
    try {
      const response = await api("/pins");
      state.pins = Array.isArray(response) ? response : response.pins || response.value || [];
      renderSpotList(); renderMarkers(); updateStatus("ready", `${state.pins.length} spots loaded`);
    } catch (error) { state.pins = []; renderSpotList(); updateStatus("error", "Backend unavailable"); showToast(error.message || "Could not load study spots.", "error"); }
  }

  function renderMarkers() {
    if (!state.map || !window.google?.maps) return;
    state.markers.forEach((marker) => marker.setMap(null)); state.markers.clear();
    const bounds = new google.maps.LatLngBounds();
    state.pins.forEach((pin, index) => {
      const lat = Number(pin.lat); const lng = Number(pin.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = new google.maps.Marker({ map: state.map, position: { lat, lng }, title: pin.cafeName || "Study spot", icon: markerIcon(pin.pinId === state.selectedPin?.pinId), zIndex: pin.pinId === state.selectedPin?.pinId ? 20 : 1 });
      marker.addListener("click", () => openPin(pin));
      marker.addListener("mouseover", () => showMarkerPreview(pin, marker, index));
      marker.addListener("mouseout", () => { if (state.selectedPin?.pinId !== pin.pinId) state.infoWindow.close(); });
      state.markers.set(pin.pinId, marker); bounds.extend({ lat, lng });
    });
    if (state.pins.length && !state.isAdding && !state.selectedPin) state.map.fitBounds(bounds, 58);
    elements["pin-count"].textContent = `${state.pins.length} ${state.pins.length === 1 ? "spot" : "spots"}`;
  }

  function renderSpotList() {
    elements["list-count"].textContent = String(state.pins.length);
    elements["spot-list"].replaceChildren();
    if (!state.pins.length) { const empty = document.createElement("p"); empty.className = "muted-text"; empty.textContent = "Your community spots will appear here."; elements["spot-list"].appendChild(empty); return; }
    sortedPins().forEach((pin) => {
      const card = document.createElement("button"); card.type = "button"; card.className = "spot-list-item"; card.dataset.pinId = pin.pinId || ""; card.addEventListener("click", () => openPin(pin));
      const copy = document.createElement("span"); copy.className = "spot-card-copy";
      const title = document.createElement("strong"); title.className = "spot-card-title"; title.textContent = pin.cafeName || "Unnamed study spot";
      const address = document.createElement("span"); address.className = "spot-card-address"; address.textContent = pin.address || "Address not provided";
      const rating = document.createElement("span"); rating.className = "mini-rating"; rating.textContent = `${stars(pin.rating)} ${formatRating(pin.rating)}`;
      copy.append(title, address, rating); card.append(copy); elements["spot-list"].appendChild(card);
    });
    updateSelectedVisuals();
  }

  function beginAddSpot(seed = {}) {
    state.isAdding = true; state.selectedPin = null; state.infoWindow?.close(); updateSelectedVisuals();
    openEditor({ cafeName: seed.cafeName || "", address: seed.address || "", lat: seed.lat ?? "", lng: seed.lng ?? "", rating: "", tags: [], note: "", pinId: "", photoKey: "" });
    document.getElementById("discover").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openPin(pin) {
    state.isAdding = false; state.selectedPin = pin; state.infoWindow?.close();
    elements["empty-state"].hidden = true; elements["spot-editor"].hidden = true; elements["spot-view"].hidden = false;
    elements["view-title"].textContent = pin.cafeName || "Unnamed study spot";
    elements["view-address"].textContent = pin.address || "Address not provided";
    elements["view-rating"].textContent = `${stars(pin.rating)} ${formatRating(pin.rating)} / 5`;
    elements["view-tags"].replaceChildren(); (pin.tags || []).forEach((tag) => { const chip = document.createElement("span"); chip.className = "tag-chip"; chip.textContent = labelForTag(tag); elements["view-tags"].appendChild(chip); });
    elements["view-note"].textContent = pin.note || "No note added yet.";
    renderDetailImage(pin);
    const marker = state.markers.get(pin.pinId);
    if (marker && state.map) { state.map.panTo(marker.getPosition()); state.map.setZoom(Math.max(state.map.getZoom() || 15, 15)); }
    updateSelectedVisuals();
    elements["spot-view"].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function renderDetailImage(pin) {
  const image = elements["view-photo"];
  if (!image) return;

  image.hidden = true;
  image.removeAttribute("src");

  image.onload = () => {
    console.log("Photo loaded successfully:", {
      pinId: pin.pinId,
      photoKey: pin.photoKey
    });
    image.hidden = false;
  };

  image.onerror = () => {
    console.error("Photo failed to load:", {
      pinId: pin.pinId,
      photoKey: pin.photoKey,
      src: image.src
    });
    image.hidden = true;
  };

  let imageUrl = readablePhotoUrl(pin);

  if (!imageUrl && pin.photoKey) {
    try {
      const presign = await api(
        `/photos?photoKey=${encodeURIComponent(pin.photoKey)}`
      );

      console.log("GET /photos response:", presign);

      imageUrl =
        presign.downloadUrl ||
        presign.photoUrl ||
        presign.url ||
        presign.signedUrl ||
        presign.presignedUrl ||
        "";

      if (!imageUrl) {
        console.error("No usable image URL returned:", presign);
        return;
      }
    } catch (err) {
      console.error("Could not fetch photo download URL:", err);
      return;
    }
  }

  if (!imageUrl) return;

  image.alt = `${pin.cafeName || "Study spot"} photo`;
  image.src = imageUrl;
}

  async function openEditor(pin) {
    elements["empty-state"].hidden = true; elements["spot-view"].hidden = true; elements["spot-editor"].hidden = false;
    elements["editor-eyebrow"].textContent = pin.pinId ? "edit pin" : "new pin"; elements["editor-title"].textContent = pin.pinId ? "Edit this spot" : "Add a study spot";
    elements["pin-id"].value = pin.pinId || ""; elements["cafe-name"].value = pin.cafeName || ""; elements["address-display"].value = pin.address || ""; elements["latitude"].value = pin.lat ?? ""; elements["longitude"].value = pin.lng ?? ""; elements["rating"].value = pin.rating ?? ""; if (elements["emoji"]) elements["emoji"].value = pin.emoji || "☕"; elements["note"].value = pin.note || ""; elements["photo-key"].value = pin.photoKey || "";
    
    // Reset file input without wiping photo-key hidden input
    elements["photo"].value = "";
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    elements["selected-photo-preview"].removeAttribute("src");
    elements["selected-photo-preview"].hidden = true;
    elements["clear-photo-button"].disabled = !pin.photoKey;
    elements["form-error"].hidden = true;
    
    // If editing an existing pin with a photoKey, fetch presigned URL and show preview
    if (pin.photoKey) {
      try {
        const presign = await api(`/photos?photoKey=${encodeURIComponent(pin.photoKey)}`);
        const url = presign.downloadUrl || presign.photoUrl || presign.url || "";
        if (url) {
          elements["selected-photo-preview"].src = url;
          elements["selected-photo-preview"].hidden = false;
          elements["clear-photo-button"].disabled = false;
        }
      } catch (e) {}
    }
    
    elements["location-summary"].textContent = pin.lat && pin.lng ? `Pinned at ${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}` : "Choose a location from search, or click the map.";
    const selectedTags = new Set(pin.tags || []); elements["spot-form"].querySelectorAll('input[name="tags"]').forEach((input) => { input.checked = selectedTags.has(input.value); });
  }

  function setEditorLocation(lat, lng, message) { elements["latitude"].value = lat; elements["longitude"].value = lng; elements["location-summary"].textContent = `${message}: ${Number(lat).toFixed(5)}, ${Number(lat).toFixed(5)}`; }

  async function savePin(event) {
    event.preventDefault(); elements["form-error"].hidden = true;
    const formData = new FormData(elements["spot-form"]); const lat = Number(formData.get("lat")); const lng = Number(formData.get("lng")); const rating = Number(formData.get("rating")); const file = elements["photo"].files[0];
    if (!formData.get("cafeName")?.trim()) return showFormError("Add a café name.");
    if (!formData.get("address")?.trim()) return showFormError("Choose or enter an address.");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return showFormError("Choose a location on the map first.");
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return showFormError("Enter a rating between 1 and 5.");
    if (file && file.size > config.maxPhotoBytes) return showFormError("Please choose an image under 2 MB.");
    setSaving(true);
    try {
      let photoKey = formData.get("photoKey") || ""; if (file) photoKey = await uploadPhoto(file);
      const payload = { cafeName: formData.get("cafeName").trim(), address: formData.get("address").trim(), lat, lng, rating, emoji: formData.get("emoji") || "☕", tags: formData.getAll("tags"), note: formData.get("note").trim() }; if (photoKey) payload.photoKey = photoKey;
      const pinId = formData.get("pinId");
      if (pinId) {
        await api(`/pins/${encodeURIComponent(pinId)}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/pins", { method: "POST", body: JSON.stringify(payload) });
      }
      await loadPins(); showToast(pinId ? "Spot updated." : "Spot added to the map."); showEmptyState();
    } catch (error) { showFormError(error.message || "The spot could not be saved."); } finally { setSaving(false); }
  }

  async function uploadPhoto(file) {
    const presign = await api("/uploads/presign", { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "image/jpeg" }) });
    if (!presign.uploadUrl || !presign.photoKey) throw new Error("Photo upload URL was not returned.");
    const response = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
    if (!response.ok) throw new Error("Photo upload failed."); return presign.photoKey;
  }

  function updatePhotoSelectionState() {
    const file = elements["photo"].files?.[0];
    elements["clear-photo-button"].disabled = !file && !elements["photo-key"].value;
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = file ? URL.createObjectURL(file) : null;
    if (file && state.previewUrl) {
      elements["selected-photo-preview"].src = state.previewUrl;
      elements["selected-photo-preview"].hidden = false;
    } else if (!elements["photo-key"].value) {
      elements["selected-photo-preview"].removeAttribute("src");
      elements["selected-photo-preview"].hidden = true;
    }
  }

  function clearPhotoSelection(showMessage = true) {
    elements["photo"].value = "";
    elements["photo-key"].value = "";
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    elements["selected-photo-preview"].removeAttribute("src");
    elements["selected-photo-preview"].hidden = true;
    elements["clear-photo-button"].disabled = true;
    if (showMessage) showToast("Selected photo removed.");
  }

  async function deleteSelectedPin() {
    if (!state.selectedPin?.pinId || !window.confirm(`Delete ${state.selectedPin.cafeName || "this spot"}?`)) return;
    try {
      const id = state.selectedPin.pinId;
      try {
        await api(`/pins/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (err) {
        // Fallback if /pins/{id} route has no CORS preflight, try query parameter endpoint /pins?pinId=...
        await api(`/pins?pinId=${encodeURIComponent(id)}`, { method: "DELETE" });
      }
      await loadPins(); showEmptyState(); showToast("Spot deleted.");
    } catch (error) { showToast(error.message || "The spot could not be deleted.", "error"); }
  }
  function showEmptyState() { state.selectedPin = null; state.isAdding = false; state.infoWindow?.close(); elements["empty-state"].hidden = false; elements["spot-view"].hidden = true; elements["spot-editor"].hidden = true; updateSelectedVisuals(); }
  function resetMapView() { if (!state.map) return; if (state.pins.length) { const bounds = new google.maps.LatLngBounds(); state.pins.forEach((pin) => bounds.extend({ lat: Number(pin.lat), lng: Number(pin.lng) })); state.map.fitBounds(bounds, 58); } else { state.map.setCenter(config.defaultCenter); state.map.setZoom(config.defaultZoom); } }

  async function api(path, options = {}) { const response = await fetch(`${config.apiBaseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } }); const contentType = response.headers.get("content-type") || ""; const body = contentType.includes("application/json") ? await response.json() : await response.text(); if (!response.ok) throw new Error((typeof body === "object" ? body.message || body.error : body) || `Request failed (${response.status})`); return body; }
  function updateStatus(name, label) { elements["api-status"].dataset.state = name; elements["api-status"].textContent = label; }
  function setSaving(saving) { elements["save-button"].disabled = saving; elements["save-button"].textContent = saving ? "Saving…" : "Save pin"; }
  function showFormError(message) { elements["form-error"].textContent = message; elements["form-error"].hidden = false; }
  function showMapMessage(title, detail) { elements.map.innerHTML = `<div class="map-message"><span class="map-message-icon">!</span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`; }
  function showToast(message, type = "success") { elements.toast.textContent = message; elements.toast.dataset.type = type; elements.toast.hidden = false; clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => { elements.toast.hidden = true; }, 3600); }

  function updateSelectedVisuals() {
    document.querySelectorAll(".spot-list-item").forEach((card) => card.classList.toggle("is-selected", card.dataset.pinId === state.selectedPin?.pinId));
    state.markers.forEach((marker, id) => { const selected = id === state.selectedPin?.pinId; marker.setIcon(markerIcon(selected)); marker.setZIndex(selected ? 20 : 1); });
  }
  function showMarkerPreview(pin, marker, index) {
    if (state.selectedPin?.pinId === pin.pinId) return;
    const card = document.createElement("div"); card.className = "marker-preview";
    const title = document.createElement("strong"); title.textContent = pin.cafeName || "Study spot";
    const rating = document.createElement("span"); rating.textContent = `${stars(pin.rating)} ${formatRating(pin.rating)}`;
    card.append(title, rating); state.infoWindow.setContent(card); state.infoWindow.open({ map: state.map, anchor: marker, shouldFocus: false });
  }
  function markerIcon(selected) { const fill = selected ? "#421d22" : "#782b31"; const stroke = selected ? "#efd2b0" : "#fffdf9"; const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54"><path d="M22 2C11 2 4 10.4 4 20.5 4 33.7 22 51 22 51s18-17.3 18-30.5C40 10.4 33 2 22 2Z" fill="${fill}" stroke="${stroke}" stroke-width="3"/><circle cx="22" cy="20" r="6" fill="#f9e4df"/></svg>`; return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new google.maps.Size(44, 54), anchor: new google.maps.Point(22, 51) }; }
  function readablePhotoUrl(pin) {
    if (pin.photoUrl || pin.imageUrl || pin.photoURL || pin.photo?.url) {
      return pin.photoUrl || pin.imageUrl || pin.photoURL || pin.photo?.url;
    }
    return "";
  }
  function imageForPin(pin, index) { return readablePhotoUrl(pin) || fallbackImage(pin, index); }
  function fallbackImage(pin, index = 0) { const seed = String(pin.pinId || pin.cafeName || index).split("").reduce((total, char) => total + char.charCodeAt(0), 0); return fallbackImages[seed % fallbackImages.length]; }
  function sortedPins() { return [...state.pins].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))); }
  function formatRating(value) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric.toFixed(1) : "—"; }
  function stars(value) { const rating = Math.round(Number(value) || 0); return `${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}`; }
  function labelForTag(tag) { return String(tag || "").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
  function escapeHtml(value) { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; }
})();
