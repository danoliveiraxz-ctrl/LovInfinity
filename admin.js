const SUPA="https://expxqynyrafienedsmuw.supabase.co";
const KEY="sb_publishable_VAXDuw0ncdrPhFleC2OiTg_NuZqofbq";
let token=null;
const $=id=>document.getElementById(id);

async function auth(path,opts={}){return fetch(SUPA+"/auth/v1/"+path,{...opts,headers:{apikey:KEY,"Content-Type":"application/json",...(opts.headers||{})}})}
async function admin(body){const r=await fetch(SUPA+"/functions/v1/admin-license",{method:"POST",headers:{Authorization:"Bearer "+token,apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||"Erro");return d}
function showPanel(){$("login").classList.add("hidden");$("panel").classList.remove("hidden");load()}
function fmt(v){return v?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(new Date(v)):"Vitalícia"}

async function load(){
  try{
    const d=await admin({action:"list"});
    const licenses=(d.licenses||[]).filter(x=>!x.revoked_at);
    $("licenses").innerHTML=licenses.map(x=>{
      const exp=fmt(x.expires_at);
      return '<div class="license"><div><b>'+x.token_last4+'</b><small>'+x.duration_type+" · criada "+fmt(x.created_at)+" · expira "+exp+" · ativações "+(x.activation_count||0)+'</small></div><div><button data-revoke="'+x.id+'">Revogar</button></div></div>';
    }).join("")||'<p class="muted">Nenhum token ativo.</p>';
    $("licenses").querySelectorAll("[data-revoke]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Revogar este token?"))return;
      try{await admin({action:"revoke",license_id:b.dataset.revoke});await load()}
      catch(e){$("panelError").textContent=e.message}
    });
  }catch(e){
    $("panelError").textContent=e.message;
    if(e.message==="not_admin")$("panelError").textContent="Sua conta ainda não está autorizada como administrador.";
  }
}

$("loginBtn").onclick=async()=>{
  try{
    $("loginError").textContent="";
    const r=await auth("token?grant_type=password",{method:"POST",body:JSON.stringify({email:$("email").value.trim(),password:$("password").value})});
    const d=await r.json();
    if(!r.ok)throw Error(d.error_description||d.msg||"Login inválido");
    token=d.access_token;showPanel();
  }catch(e){$("loginError").textContent=e.message}
};
$("logout").onclick=()=>{token=null;$("panel").classList.add("hidden");$("login").classList.remove("hidden")};
$("refresh").onclick=load;
document.querySelectorAll("[data-plan]").forEach(b=>b.onclick=async()=>{
  try{
    $("panelError").textContent="";b.disabled=true;
    const d=await admin({action:"generate",duration_type:b.dataset.plan});
    $("newToken").textContent=d.token||d.license_token||JSON.stringify(d);
    $("newToken").classList.remove("hidden");await load();
  }catch(e){$("panelError").textContent=e.message}
  finally{b.disabled=false}
});
