const ENDPOINT="https://expxqynyrafienedsmuw.supabase.co/functions/v1/validate-license";
const CONNECTIONS="https://expxqynyrafienedsmuw.supabase.co/functions/v1/connections";
const LANDING="https://lovinfinitybot.lovable.app";
const $=id=>document.getElementById(id);
let activeSession="",pendingProvider="";
function installationId(){return new Promise(resolve=>chrome.storage.local.get(["installation_id"],d=>{if(d.installation_id)return resolve(d.installation_id);const id=crypto.randomUUID();chrome.storage.local.set({installation_id:id},()=>resolve(id));}));}
function show(id){["loading","gate","home"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function formatExpiry(v){if(!v)return"Vitalícia";return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(new Date(v));}
function openLanding(){chrome.tabs.create({url:LANDING});}
function invalidMessage(reason){if(reason==="expired")return"Esta licença expirou.";if(reason==="revoked")return"Esta licença foi revogada.";return"Token inválido ou não encontrado.";}
async function validate(token){const installation_id=await installationId();const r=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,installation_id})});if(!r.ok)throw Error("Não foi possível validar o token.");return r.json();}
async function api(body){const r=await fetch(CONNECTIONS,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||"Erro");return d;}
function renderHome(l){$("plan").textContent=l.duration_type==="lifetime"?"Vitalícia":l.duration_type==="month"?"1 mês":"1 semana";$("expires").textContent=formatExpiry(l.expires_at);activeSession=l.session_token||"";show("home");loadConnections();}
async function loadConnections(){if(!activeSession)return;try{const d=await api({action:"list",session_token:activeSession});const c=d.connections||[];for(const p of["github","lovable","openai"]){const x=c.find(v=>v.provider===p);const state=$(p+"State"),btn=$(p+"Connect");state.textContent=x?(x.external_account_name||"Conectado"):"Não conectado";if(p==="lovable"){btn.textContent=x?"Reconectar com Lovable":"Conectar com Lovable";if(x)await loadLovableProjects();else{$("lovableProjectBox").classList.add("hidden");}}else btn.textContent=x?"Reconectar":"Conectar";}}catch(e){}}
async function boot(){chrome.storage.local.get(["license"],async d=>{if(!d.license?.token){show("gate");return}try{const r=await validate(d.license.token);if(r.valid){const l={...d.license,...r};chrome.storage.local.set({license:l});renderHome(l)}else{chrome.storage.local.remove("license");show("gate");$("error").textContent=invalidMessage(r.reason);$("acquireToken").classList.remove("hidden")}}catch(e){show("gate");$("error").textContent="Sem conexão com o servidor para validar a licença.";}});}
$("activate").onclick=async()=>{const token=$("token").value.trim();$("error").textContent="";$("acquireToken").classList.add("hidden");if(!token){$("error").textContent="Digite seu token.";return}$("activate").disabled=true;try{const r=await validate(token);if(!r.valid){$("error").textContent=invalidMessage(r.reason);$("acquireToken").classList.remove("hidden");return}const l={token,...r};chrome.storage.local.set({license:l},()=>renderHome(l))}catch(e){$("error").textContent=e.message||"Erro ao validar."}finally{$("activate").disabled=false}};
$("acquireToken").onclick=openLanding;
$("refreshConnections").onclick=loadConnections;
$("githubConnect").onclick=async()=>{try{const d=await api({action:"github_start",session_token:activeSession});if(!d.url)throw Error("GitHub OAuth não configurado.");chrome.tabs.create({url:d.url});setTimeout(loadConnections,4000);setTimeout(loadConnections,9000)}catch(e){$("githubState").textContent=e.message}};
async function loadLovableProjects(){
  if(!activeSession)return;
  const box=$("lovableProjectBox"),select=$("lovableProject"),state=$("lovableProjectState");
  try{
    state.textContent="Carregando seus projetos...";
    const d=await api({action:"lovable_projects",session_token:activeSession});
    const projects=d.projects||[];
    select.innerHTML='<option value="">Selecione um projeto...</option>'+projects.map(p=>'<option value="'+String(p.id||p.project_id).replace(/"/g,"&quot;")+'">'+(p.name||p.project_name||p.id||p.project_id)+'</option>').join("");
    if(d.active_project?.id)select.value=d.active_project.id;
    state.textContent=projects.length?(d.active_project?"Projeto ativo: "+(d.active_project.name||d.active_project.id):"Escolha qual projeto o LovInfinity deve alterar."):"Nenhum projeto encontrado.";
    box.classList.remove("hidden");
  }catch(e){state.textContent=e.message||"Não foi possível carregar os projetos."}
}
$("lovableProject").onchange=async()=>{
  const id=$("lovableProject").value;if(!id)return;
  const name=$("lovableProject").selectedOptions[0]?.textContent||id;
  $("lovableProjectState").textContent="Salvando projeto ativo...";
  try{
    const d=await api({action:"lovable_select_project",project_id:id,project_name:name,session_token:activeSession});
    $("lovableProjectState").textContent="Projeto ativo: "+(d.active_project?.name||name);
  }catch(e){$("lovableProjectState").textContent=e.message||"Erro ao selecionar projeto."}
};
$("lovableRefresh").onclick=loadLovableProjects;
$("lovableConnect").onclick=async()=>{const btn=$("lovableConnect");try{btn.disabled=true;$("lovableState").textContent="Abrindo autorização...";const d=await api({action:"lovable_start",session_token:activeSession});if(!d.url)throw Error("OAuth da Lovable não configurado.");chrome.tabs.create({url:d.url});let tries=0;const poll=setInterval(async()=>{tries++;await loadConnections();if($("lovableState").textContent!=="Não conectado"||tries>=15){clearInterval(poll);btn.disabled=false}},2000)}catch(e){$("lovableState").textContent=e.message;btn.disabled=false}};
$("openaiConnect").onclick=()=>{pendingProvider="openai";$("keyTitle").textContent="Conectar OpenAI";$("apiKey").value="";$("keyError").textContent="";$("keyBox").classList.remove("hidden");};
$("saveKey").onclick=async()=>{try{const key=$("apiKey").value.trim();if(!key)throw Error("Cole a chave.");$("saveKey").disabled=true;await api({action:"connect_key",provider:pendingProvider,api_key:key,session_token:activeSession});$("keyBox").classList.add("hidden");await loadConnections()}catch(e){$("keyError").textContent=e.message}finally{$("saveKey").disabled=false}};
$("cancelKey").onclick=()=>{$("keyBox").classList.add("hidden")};
$("logout").onclick=()=>chrome.storage.local.remove("license",()=>{activeSession="";show("gate")});
boot();
$("adminPanel").onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL("admin.html")});
