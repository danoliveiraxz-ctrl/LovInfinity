const ENDPOINT="https://expxqynyrafienedsmuw.supabase.co/functions/v1/validate-license";
const $=id=>document.getElementById(id);

function installationId(){
  return new Promise(resolve=>{
    chrome.storage.local.get(["installation_id"], data=>{
      if(data.installation_id) return resolve(data.installation_id);
      const id=crypto.randomUUID();
      chrome.storage.local.set({installation_id:id},()=>resolve(id));
    });
  });
}

function show(id){["loading","gate","home"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}

function formatExpiry(value){
  if(!value) return "Vitalícia";
  return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(new Date(value));
}

async function validate(token){
  const installation_id=await installationId();
  const res=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,installation_id})});
  if(!res.ok) throw new Error("Não foi possível validar o token.");
  return res.json();
}

async function boot(){
  chrome.storage.local.get(["license"], async data=>{
    if(!data.license?.token){show("gate");return;}
    try{
      const result=await validate(data.license.token);
      if(result.valid){
        const license={...data.license,...result};
        chrome.storage.local.set({license});
        renderHome(license);
      }else{
        chrome.storage.local.remove("license");
        show("gate");
        $("error").textContent=result.reason==="expired"?"Esta licença expirou.":"Esta licença não é válida.";
      }
    }catch(e){
      show("home");
      renderHome(data.license,true);
    }
  });
}

function renderHome(license,offline=false){
  $("plan").textContent=license.duration_type==="lifetime"?"Vitalícia":license.duration_type==="month"?"1 mês":"1 semana";
  $("expires").textContent=offline?"Última validação":formatExpiry(license.expires_at);
  show("home");
}

$("activate").addEventListener("click",async()=>{
  const token=$("token").value.trim();
  $("error").textContent="";
  if(!token){$("error").textContent="Digite seu token.";return;}
  $("activate").disabled=true;
  try{
    const result=await validate(token);
    if(!result.valid){$("error").textContent=result.reason==="expired"?"Esta licença expirou.":result.reason==="revoked"?"Esta licença foi revogada.":"Token inválido ou não encontrado.";return;}
    const license={token,...result};
    chrome.storage.local.set({license},()=>renderHome(license));
  }catch(e){$("error").textContent=e.message||"Erro ao validar."; }
  finally{$("activate").disabled=false;}
});

$("logout").addEventListener("click",()=>{
  chrome.storage.local.remove("license",()=>show("gate"));
});

boot();