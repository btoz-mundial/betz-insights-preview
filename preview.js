"use strict";

//--------------------------------------------------------------
// 1. Preview-only runtime: a frozen, same-origin public snapshot
//--------------------------------------------------------------
const PREVIEW_REPOSITORY = "btoz-mundial/betz-insights-preview";
const previewAssetVersion=document.currentScript?new URL(document.currentScript.src,document.baseURI).searchParams.get("v"):null;
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
// 2. Read-only behavior; retain the full navigation for layout review
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
renderGrupos = function renderPreviewGroupsPlaceholder(){
  const screen = document.querySelector('.screen[data-route="grupos"]');
  screen.querySelector(".h1").textContent = "Mis grupos";
  screen.querySelector(".sub").textContent = "Tu gente. Tus cuentas pendientes.";
  el("grupos-root").innerHTML = '<div class="stub"><h3>Aquí se arma la rivalidad.</h3><p>Espacio reservado para tus grupos. En esta página de pruebas solo mostramos su lugar en la navegación.</p><span class="tag">Placeholder</span></div>';
};
sgOnEnter = function(){ renderGrupos(); };
const originalRenderPerfil = renderPerfil;
renderPerfil = function(){ originalRenderPerfil(); el("my-predictions-nav").hidden = true; };
document.addEventListener("click", event => {
  if(event.target.closest('a[href*="predict.html"]')) event.preventDefault();
}, true);

//--------------------------------------------------------------
// 3. Isolated Insights route: share the current profile and checkpoint
//--------------------------------------------------------------
const insightParams=new URL(location.href).searchParams;
const insightState={bundle:null,mode:insightParams.get("modo")==="comparar"?"compare":"player",scope:insightParams.get("alcance")==="jornada"?"week":"season",rival:insightParams.get("rival")||"PACOT",request:0};
if(insightParams.get("jugador"))state.player=insightParams.get("jugador");
TABS.splice(3,0,["insights","Insights"]);
ICONS.insights='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M6 15v-4M12 15V5M18 15V8"/><path d="m4 6 3-3 3 3"/></svg>';
nav.innerHTML=TABS.map(([r,l])=>'<button data-go="'+r+'">'+(ICONS[r]||"")+'<span>'+l+'</span></button>').join("");
const insightsScreen=document.createElement("section");
insightsScreen.className="screen";insightsScreen.dataset.route="insights";insightsScreen.setAttribute("aria-label","Insights");
document.querySelector("main").appendChild(insightsScreen);
const profileEntry=document.createElement("button");profileEntry.type="button";profileEntry.className="ix-profile-entry";profileEntry.dataset.go="insights";
el("p-di").after(profileEntry);
function insightSelectionUrl(url){
  const out=new URL(url,location.href);
  out.searchParams.set("jugador",state.player);
  out.searchParams.set("modo",insightState.mode==="compare"?"comparar":"jugador");
  if(insightState.mode==="compare"){out.searchParams.set("rival",insightState.rival);out.searchParams.set("alcance",insightState.scope==="week"?"jornada":"temporada");}
  else{out.searchParams.delete("rival");out.searchParams.delete("alcance");}
  return out.pathname+out.search+out.hash;
}
function rememberInsightSelection(){if(currentRoute()==="insights")history.replaceState(null,"",insightSelectionUrl(location.href));}
function renderInsights(){
  const bundle=insightState.bundle;
  if(bundle&&!bundle.players.some(p=>p.user_id===insightState.rival&&p.user_id!==state.player))insightState.rival=bundle.players.find(p=>p.user_id!==state.player)?.user_id||null;
  const periodLabels=Object.fromEntries((state.periodResults?.periods||[]).map(p=>[p.period_id,periodLabel(p)]));
  const matchLabels=Object.fromEntries((state.context?.matches||[]).map(m=>[m.match_id,m.away_team.id+" @ "+m.home_team.id]));
  const active=document.activeElement,focusId=insightsScreen.contains(active)?active.id:null;
  insightsScreen.innerHTML=BetzInsightsView.render(bundle,{player:state.player,rival:insightState.rival,mode:insightState.mode,scope:insightState.scope,checkpointLabel:checkpointLabel(state.cp),periodLabels,matchLabels});
  if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
  const p=bundle?.players.find(p=>p.user_id===state.player);
  profileEntry.innerHTML=p&&["available","provisional"].includes(p.season_accuracy.status)?'<span><b>'+BetzInsightsView.percent(p.season_accuracy.accuracy_rate)+' de efectividad</b><small>'+p.season_accuracy.correct+' de '+p.season_accuracy.resolved_opportunities+' aciertos · Ver Insights</small></span><span aria-hidden="true">↗</span>':'<span><b>Tu juego, en números</b><small>Abrir Insights</small></span><span aria-hidden="true">↗</span>';
}
async function loadInsights(){
  const request=++insightState.request;insightState.bundle=null;
  try{
    const b=await getJSON("checkpoints/"+state.cp+"/insights/player_insights.json");
    if(b.contract_type!=="betz_player_insights_preview"||b.contract_version!=="1.0"||b.competition_id!=="NFL2026"||b.selected_period?.checkpoint_id!==state.cp||!Array.isArray(b.players)||!b.players.length||!Array.isArray(b.pair_comparisons))throw new Error("INSIGHTS_VIEW_CONTRACT_INVALID");
    if(request===insightState.request)insightState.bundle=b;
  }catch(e){if(request===insightState.request)insightState.bundle=null;}
  if(request===insightState.request){renderInsights();rememberInsightSelection();}
}
const previewLoadCheckpoint=loadCheckpoint;
loadCheckpoint=async function(){await previewLoadCheckpoint();await loadInsights();};
const previewSelectPlayer=selectPlayer;
selectPlayer=function(id){previewSelectPlayer(id);renderInsights();rememberInsightSelection();};
const previewGo=go;
go=function(route){previewGo(route);if(route==="insights"){renderInsights();rememberInsightSelection();}};
const previewCheckpointUrl=publicCheckpointUrl;
publicCheckpointUrl=function(id){const url=previewCheckpointUrl(id);return currentRoute()==="insights"?insightSelectionUrl(url):url;};
const previewRenderPerfil=renderPerfil;
renderPerfil=function(){previewRenderPerfil();const label=el("p-perf").querySelector('[data-explain="efficiency"] .k');if(label)label.textContent="Conversión de puntos";renderInsights();};
EXPLAIN.efficiency.t="Conversión de puntos";
insightsScreen.addEventListener("change",event=>{
  if(event.target.id==="insights-player")selectPlayer(event.target.value);
  if(event.target.id==="insights-rival"){insightState.rival=event.target.value;renderInsights();rememberInsightSelection();}
});
insightsScreen.addEventListener("click",event=>{
  const mode=event.target.closest("[data-ix-mode]"),scope=event.target.closest("[data-ix-scope]");
  if(mode){insightState.mode=mode.dataset.ixMode;renderInsights();rememberInsightSelection();insightsScreen.querySelector('[data-ix-mode="'+insightState.mode+'"]').focus({preventScroll:true});}
  if(scope){insightState.scope=scope.dataset.ixScope;renderInsights();rememberInsightSelection();insightsScreen.querySelector('[data-ix-scope="'+insightState.scope+'"]').focus({preventScroll:true});}
  if(event.target.closest("[data-ix-retry]"))loadInsights();
});
//--------------------------------------------------------------
// 3a. Table view switches existing official lists without rebuilding their data
//--------------------------------------------------------------
const tableScreen=document.querySelector('.screen[data-route="tabla"]');
let tableScope=insightParams.get("tabla")==="acumulado"?"acumulado":"jornada";
const tableSwitch=document.createElement("div");
tableSwitch.className="ix-mode tabla-scope";
tableSwitch.setAttribute("role","group");tableSwitch.setAttribute("aria-label","Clasificación de la tabla");
tableSwitch.innerHTML='<button type="button" data-table-scope="jornada" aria-controls="tabla-jornada">Jornada</button><button type="button" data-table-scope="acumulado" aria-controls="tabla-acumulado">Acumulado</button>';
const weeklyTablePanel=document.createElement("div"),seasonTablePanel=document.createElement("div");
weeklyTablePanel.id="tabla-jornada";seasonTablePanel.id="tabla-acumulado";
weeklyTablePanel.setAttribute("role","region");weeklyTablePanel.setAttribute("aria-label","Tabla de jornada");
seasonTablePanel.setAttribute("role","region");seasonTablePanel.setAttribute("aria-label","Tabla acumulada");
const weeklyNavigation=el("tabla-prev").closest(".wknav-pill");
weeklyNavigation.previousElementSibling.remove();
// Retain the hidden IDs for the base renderer; the checkpoint pills own selection.
weeklyNavigation.hidden=true;
weeklyTablePanel.append(weeklyNavigation,el("weekly-leaderboard"),el("weekly-note"),el("weekly-lock-note"));
const accumulatedList=el("leaderboard");
seasonTablePanel.append(accumulatedList.previousElementSibling,accumulatedList,accumulatedList.nextElementSibling);
tableScreen.querySelector(".season-summary").after(tableSwitch,weeklyTablePanel,seasonTablePanel);
function renderTableScope(){
  weeklyTablePanel.hidden=tableScope!=="jornada";seasonTablePanel.hidden=tableScope!=="acumulado";
  tableSwitch.querySelectorAll("[data-table-scope]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.tableScope===tableScope)));
}
function tableSelectionUrl(value){const url=new URL(value,location.href);url.searchParams.set("tabla",tableScope);return url.pathname+url.search+url.hash;}
function rememberTableScope(){if(currentRoute()==="tabla")history.replaceState(null,"",tableSelectionUrl(location.href));}
tableSwitch.addEventListener("click",event=>{const button=event.target.closest("[data-table-scope]");if(!button)return;tableScope=button.dataset.tableScope;renderTableScope();rememberTableScope();});
const previewTableGo=go;
go=function(route){previewTableGo(route);if(route==="tabla"){renderTableScope();rememberTableScope();}};
const previewTableCheckpointUrl=publicCheckpointUrl;
publicCheckpointUrl=function(id){
  const url=new URL(previewTableCheckpointUrl(id),location.href);
  if(previewAssetVersion)url.searchParams.set("v",previewAssetVersion);
  const path=url.pathname+url.search+url.hash;
  return currentRoute()==="tabla"?tableSelectionUrl(path):path;
};
// Keep Tabla on its visible checkpoint even after Partidos browses another period.
const previewRenderTabla=renderTabla;
renderTabla=function(){
  const previousPeriodIndex=state.periodIndex;
  state.periodIndex=periods().findIndex(period=>periodCheckpointId(period)===state.cp);
  try{previewRenderTabla();}finally{state.periodIndex=previousPeriodIndex;}
};
renderTableScope();
//--------------------------------------------------------------
// 4. Start the existing read app; no provider, capture or scoring is invoked
//--------------------------------------------------------------
boot();
