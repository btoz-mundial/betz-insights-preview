"use strict";

//--------------------------------------------------------------
// 1. Preview-only runtime: a frozen, same-origin public snapshot
//--------------------------------------------------------------
const PREVIEW_REPOSITORY = "btoz-mundial/betz-insights-preview";
loadRuntime = async function loadPreviewRuntime(){
  if(location.hostname === "betz-app.github.io") throw new Error("PREVIEW_PRODUCTION_HOST_BLOCKED");
  const read = async name => {
    const response = await fetch(new URL(name, document.baseURI), {credentials:"omit", cache:"no-store"});
    if(!response.ok) throw new Error("PREVIEW_FILE_UNAVAILABLE");
    return response.json();
  };
  const [runtime, snapshot] = await Promise.all([read("betz-read-runtime.json"), read("preview-snapshot.json")]);
  if(runtime.environment !== "PREVIEW" || runtime.competition_id !== "NFL2026" || runtime.data_path !== "data/NFL2026/" || runtime.read_only !== true) throw new Error("PREVIEW_RUNTIME_INVALID");
  const allowed = ["contract_type","contract_version","environment","competition_id","data_path","read_only"];
  if(Object.keys(runtime).some(key => !allowed.includes(key))) throw new Error("PREVIEW_RUNTIME_EXTRA_FIELD");
  if(snapshot.environment !== "PREVIEW" || snapshot.public_repository !== PREVIEW_REPOSITORY || snapshot.read_only !== true || !/^[a-f0-9]{40}$/.test(snapshot.public_baseline_commit)) throw new Error("PREVIEW_SNAPSHOT_INVALID");
  state.runtime = runtime;
  DATA = new URL(runtime.data_path, document.baseURI);
  if(DATA.origin !== location.origin) throw new Error("PREVIEW_CROSS_ORIGIN_BLOCKED");
  const cutoff = new Date(snapshot.captured_at).toLocaleString("es-MX", {timeZone:"America/Mexico_City",dateStyle:"medium",timeStyle:"short"});
  document.title = "BETZ · Pruebas";
  el("preview-cutoff").textContent = "Copia al " + cutoff + " · " + checkpointLabel(snapshot.current_period_id);
  el("env-note").textContent = "Entorno de pruebas. Datos públicos copiados; esta página no actualiza la competencia.";
};

//--------------------------------------------------------------
// 2. Read-only behavior; no receiver, capture, or telemetry
//--------------------------------------------------------------
initClarity = function(){ /* Preview sessions never enter production telemetry. */ };
getRootJSON = async function(){ return null; };
const originalStripPersonalKey = stripPersonalKey;
stripPersonalKey = function(){ originalStripPersonalKey(); __personalCapability = ""; };
loadProfilePickStatuses = async function(){};
loadPodPickStatuses = async function(){};
renderPickChips = function(){
  el("p-pickchip-slot").textContent = "";
  el("p-nolock").hidden = true;
};
const privateGroupsIndex = TABS.findIndex(tab => tab[0] === "grupos");
if(privateGroupsIndex >= 0) TABS.splice(privateGroupsIndex, 1);
nav.querySelector('[data-go="grupos"]')?.remove();
sgOnEnter = function(){ fail("Los grupos privados no forman parte de esta copia de pruebas."); };
const originalRenderPerfil = renderPerfil;
renderPerfil = function(){ originalRenderPerfil(); el("my-predictions-nav").hidden = true; };
document.addEventListener("click", event => {
  if(event.target.closest('a[href*="predict.html"]')) event.preventDefault();
}, true);

//--------------------------------------------------------------
// 3. Start the existing, contract-driven read app
//--------------------------------------------------------------
boot();
