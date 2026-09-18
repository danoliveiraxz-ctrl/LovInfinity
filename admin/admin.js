const SUPABASE_URL="https://expxqynyrafienedsmuw.supabase.co";
const SUPABASE_KEY="sb_publishable_VAXDuw0ncdrPhFleC2OiTg_NuZqofb";
const ADMIN_FN=SUPABASE_URL+"/functions/v1/admin-license";
const OPENAI_FN=SUPABASE_URL+"/functions/v1/openai-assistant";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
async function call(url,body){const {data:{session}}=await sb.auth.getSession();if(!session)throw Error("Faça login.");const r=await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||"Erro");return d}
async function load(){const d=await call(ADMIN_FN,{action:"list"});const a=d.licenses||[];$("licenses").textContent=a.map(x=>x.token_last4+" | "+x.duration_type+" | "+x.status).join("\n")||"Nenhuma licença."; }
$("login").onclick=async()=>{try{const {error}=await sb.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)throw error;$("auth").hidden=true;$("panel").hidden=false;await load()}catch(e){$("message").textContent=e.message}};
$("signup").onclick=async()=>{try{const {error}=await sb.auth.signUp({email:$("email").value,password:$("password").value});if(error)throw error;$("message").textContent="Conta criada. Confirme o e-mail se necessário e depois entre."}catch(e){$("message").textContent=e.message}};
document.querySelectorAll("[data-duration]").forEach(b=>b.onclick=async()=>{try{const d=await call(ADMIN_FN,{action:"generate",duration_type:b.dataset.duration});$("token").textContent=d.token;await navigator.clipboard?.writeText(d.token);await load()}catch(e){$("message").textContent=e.message}});
$("aiTest").onclick=async()=>{try{const d=await call(OPENAI_FN,{input:$("aiInput").value||"Responda: LovInfinity OK"});$("aiOutput").textContent=d.output||""}catch(e){$("aiOutput").textContent=e.message}};
