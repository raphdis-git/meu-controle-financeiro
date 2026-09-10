'use strict';
// Public browser key; all data access is restricted by Postgres RLS.
const DB_URL='https://ptafybhxnksijeudygvc.supabase.co';
const DB_PUBLIC_KEY='sb_publishable_Cdu7visHyN6QZUQ5mBmeLA_zrDOx-S9';
const initialRows=structuredClone(rows).map(({example,...r})=>r);
let client=null,currentUser=null,revision=0,busy=false,loaded=false,loadGeneration=0;
function snapshot(){return {rows:structuredClone(rows),records:structuredClone(records),archived:[...archived]}}
function restore(document){
 if(!document||!Array.isArray(document.rows)||!document.records||typeof document.records!=='object'||!Array.isArray(document.archived))throw Error('INVALID_DOCUMENT');
 rows.splice(0,rows.length,...structuredClone(document.rows));
 for(const k of Object.keys(records))delete records[k];
 Object.assign(records,structuredClone(document.records));archived.clear();document.archived.forEach(p=>archived.add(p));
 const years=new Set([...Object.keys(records).map(k=>Number(k.split('-')[1])),...document.archived.map(p=>Math.floor(p/12)),...document.rows.flatMap(r=>(r.recurrences||[]).map(rule=>Math.floor(rule.start/12)))]);
 for(const y of years)if(Number.isInteger(y)&&!Array.from($('#year').options).some(o=>Number(o.value)===y))$('#year').add(new Option(String(y),String(y)));
 render();
}
function freeze(value){busy=value;$('#workspace').inert=value;document.querySelectorAll('dialog').forEach(d=>d.inert=value);$('#logout').disabled=value;document.body.classList.toggle('saving',value)}
function syncMessage(message){$('#sync-status').textContent=message}
function readable(error){if(error?.message?.includes('REVISION_CONFLICT')||error?.code==='40001')return 'Outra janela atualizou este orçamento. Clique em Atualizar dados antes de tentar novamente.';return 'Não foi possível salvar. Verifique sua conexão e sessão e tente novamente. Nenhuma alteração foi confirmada.'}
async function saveMutation(action,event){
 if(event?.preventDefault)event.preventDefault();
 if(!loaded||busy||!currentUser)return;
 const before=snapshot(),uid=currentUser.id,wasOpen=$('#editor').open,rowWasOpen=$('#row-editor').open;
 freeze(true);suppressToast=true;lastToast='';
 try{
  action(event);
  const document=snapshot();
  if(JSON.stringify(before)===JSON.stringify(document))return;
  const message=lastToast;syncMessage('Salvando…');
  const {data,error}=await client.rpc('save_orcamento',{p_document:document,p_revision:revision});
  if(error)throw error;
  if(currentUser?.id!==uid)return;
  revision=Number(data);syncMessage('Todas as alterações estão salvas.');
  suppressToast=false;toast(message||'Alterações salvas.');
 }catch(error){
  if(currentUser?.id===uid){restore(before);if(active)active.row=rows.find(r=>r.id===active.row.id)??active.row;syncMessage(readable(error));if(wasOpen&&!$('#editor').open)$('#editor').showModal();$('#error').textContent=readable(error);if(rowWasOpen){if(!$('#row-editor').open)$('#row-editor').showModal();$('#row-edit-error').textContent=readable(error)}}
 }finally{suppressToast=false;freeze(false)}
}
const sortAccountsLocally=sortAccounts;
sortAccounts=event=>saveMutation(sortAccountsLocally,event);
// One atomic save includes every installment, payment, deletion or archive change.
for(const [selector,eventName] of [['#row-edit-form','onsubmit'],['#editform','onsubmit'],['#newform','onsubmit'],['#delete-all','onclick'],['#delete-current','onclick'],['#delete-future','onclick'],['#archive-month','onclick']]){
 const el=$(selector),original=el[eventName];el[eventName]=event=>saveMutation(original,event);
}
async function loadBudget(user){
 const generation=++loadGeneration;loaded=false;freeze(true);syncMessage('Carregando orçamento…');
 try{
  const {data,error}=await client.from('orcamentos').select('document,revision').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  if(generation!==loadGeneration||currentUser?.id!==user.id)return;
  restore(data?.document||{rows:initialRows,records:{},archived:[]});revision=Number(data?.revision||0);loaded=true;
  syncMessage(data?'Orçamento carregado. Suas alterações serão salvas automaticamente.':'Seu orçamento está pronto. Preencha os valores das suas contas para começar.');
 }catch(error){if(generation===loadGeneration)syncMessage('Não foi possível carregar os dados. Clique em Atualizar dados para tentar novamente. As edições estão bloqueadas.')}
 finally{if(generation===loadGeneration){freeze(false);$('#budget').inert=!loaded;$('#add').disabled=!loaded}}
}
async function acceptSession(session){
 const user=session?.user||null;
 if(user?.id&&user.id===currentUser?.id)return;
 $('#show-hidden').checked=false;currentUser=user;loaded=false;revision=0;++loadGeneration;
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());active=null;draft=null;editingRowId=null;
 $('#workspace').hidden=!user;$('#auth-panel').hidden=!!user;$('#logout').hidden=!user;$('#user-label').textContent=user?.email||'';
 restore({rows:initialRows,records:{},archived:[]});
 if(user)await loadBudget(user);
}
$('#reload-data').onclick=()=>{if(currentUser&&!busy)loadBudget(currentUser)};
async function authenticate(signup){
 if(!client||!$('#login-form').reportValidity())return;
 $('#auth-message').textContent=signup?'Criando conta…':'Entrando…';$('#login-form').inert=true;
 try{
  const credentials={email:$('#email').value.trim(),password:$('#password').value};
  const {data,error}=signup?await client.auth.signUp({...credentials,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword(credentials);
  if(error)throw error;
  $('#password').value='';
  $('#auth-message').textContent=data.session?'':'Confira seu e-mail para confirmar o cadastro. Depois volte aqui e entre.';
  if(data.session)await acceptSession(data.session);
 }catch(error){$('#auth-message').textContent=signup?'Não foi possível criar a conta. Verifique os dados ou tente novamente mais tarde.':'Não foi possível entrar. Confira e-mail, senha e confirmação do cadastro.'}
 finally{$('#login-form').inert=false}
}
$('#login-form').onsubmit=e=>{e.preventDefault();authenticate(false)};
$('#signup').onclick=()=>authenticate(true);
$('#logout').onclick=async()=>{if(busy)return;const {error}=await client.auth.signOut();if(error){syncMessage('Não foi possível sair. Tente novamente.');return}await acceptSession(null)};
window.addEventListener('beforeunload',e=>{if(busy&&loaded){e.preventDefault();e.returnValue=''}});
if(!window.supabase){$('#auth-message').textContent='Não foi possível carregar o serviço de acesso. Verifique a conexão e recarregue a página.';$('#login-form').inert=true}
else{
 client=window.supabase.createClient(DB_URL,DB_PUBLIC_KEY);
 client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>acceptSession(session),0)});
 client.auth.getSession().then(({data,error})=>{if(error)$('#auth-message').textContent='Sua sessão expirou. Entre novamente.';else acceptSession(data.session)});
}
