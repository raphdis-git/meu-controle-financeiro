const $=s=>document.querySelector(s),fmt=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];const groups=['Renda familiar','Habitação','Saúde','Automóvel','Outras despesas','Lazer','Investimentos e compromissos','Cartões de crédito'];let selectedMonth=new Date().getMonth(),active=null,draft=null;const records={};const archived=new Set();
const rows=[['Salário Raphael',0,4200],['Salário Aira',0,2800],['Condomínio Apartamento',1,380],['Equatorial Apartamento',1,165],['Saneago Apartamento',1,85],['Internet',1,100],['Amil Dental Raphael',2,65],['Combustível',3,180],['IPVA Moto',3,55],['Academia / CrossFit',4,150],['Reserva de emergência',4,300],['Lanche',5,120],['Financiamento Apartamento',6,1100],['Nubank Raphael',7,450],['Nubank Aira',7,320],['BMG',7,140],['Renner',7,80],['Mercado Pago',7,180],['Caixa',7,210]].map((r,i)=>({id:i+1,name:r[0],group:r[1],example:r[2]}));
function key(r,m,y=$('#year').value){return `${r.id}-${y}-${m}`}function blank(){return{value:null,manual:null,paid:false,actual:null,due:'',paiddate:'',purchases:[]}}function rec(r,m,y){return records[key(r,m,y)]||blank()}function total(r,c){return r.group===7?(c.manual!==null?c.manual:c.purchases.reduce((a,b)=>a+b.cents,0)/100):c.value??0}function exists(r,c){return r.group===7?c.manual!==null||c.purchases.length>0:c.value!==null}function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}let suppressToast=false,lastToast='';function toast(t){if(suppressToast){lastToast=t;return}$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',2400)}
const currentYear=new Date().getFullYear();$('#year').innerHTML=Array.from({length:8},(_,i)=>currentYear-2+i).map(y=>`<option>${y}</option>`).join('');$('#year').value=String(currentYear);
$('#month').innerHTML=months.map((m,i)=>`<option value="${i}">${m}</option>`).join('');$('#month').value=selectedMonth;$('#group').innerHTML=groups.map((g,i)=>`<option value="${i}">${g}</option>`).join('');
function periodLabel(p){return `${months[p%12]} de ${Math.floor(p/12)}`}
function visiblePeriods(){
 const base=Number($('#year').value)*12;
 let end=base+11;
 for(const [k,c] of Object.entries(records)){const [,y,m]=k.split('-').map(Number);if(c.purchases.length&&y*12+m>=base)end=Math.max(end,y*12+m)}
 return Array.from({length:end-base+1},(_,i)=>base+i).filter(p=>$('#show-archived').checked||!archived.has(p));
}
function canArchive(p){const entries=rows.filter(r=>r.group!==0).map(r=>[r,rec(r,p%12,Math.floor(p/12))]).filter(([r,c])=>exists(r,c));return entries.length>0&&entries.every(([,c])=>c.paid)}
function archiveControl(){
 const p=Number($('#year').value)*12+selectedMonth,isArchived=archived.has(p),ready=canArchive(p);
 $('#archive-month').textContent=isArchived?'Reabrir mês':'Arquivar mês';$('#archive-month').disabled=!isArchived&&!ready;
 $('#archive-message').textContent=isArchived?`${periodLabel(p)} está arquivado.`:ready?`Tudo pago em ${periodLabel(p)}. Deseja arquivar?`:`${periodLabel(p)}: quite todas as contas e faturas para arquivar.`;
}
function render(){
 const y=Number($('#year').value),periods=visiblePeriods();let income=0,expense=0,paid=0,pending=0;
 for(const r of rows){const c=rec(r,selectedMonth),t=total(r,c);if(r.group===0)income+=t;else{expense+=t;if(c.paid)paid+=c.actual??t;else pending+=t}}
 $('#metrics').innerHTML=[['Receitas previstas',income,`${months[selectedMonth]} ${y}`],['Despesas previstas',expense,`Pago: ${fmt(paid)}`],['Falta pagar',pending,'Contas e faturas pendentes'],['Saldo previsto',income-expense,'Receitas menos despesas']].map(a=>`<article class="metric"><p>${a[0]}</p><strong>${fmt(a[1])}</strong><small>${a[2]}</small></article>`).join('');
 archiveControl();
 let h='<thead><tr><th>Conta / cartão</th>'+periods.map(p=>`<th class="${p===y*12+selectedMonth?'selected':''}">${months[p%12].slice(0,3)} ${Math.floor(p/12)}${archived.has(p)?'<small class="archived-label">Arquivado</small>':''}</th>`).join('')+'</tr></thead><tbody>';
 groups.forEach((g,gi)=>{h+=`<tr class="group"><th>${g.toLocaleUpperCase('pt-BR')}</th>${periods.length?`<td colspan="${periods.length}"></td>`:''}</tr>`;rows.filter(r=>r.group===gi).forEach(r=>{
 h+=`<tr><th>${esc(r.name)}</th>`;
 for(const p of periods){const m=p%12,yr=Math.floor(p/12),c=rec(r,m,yr),has=exists(r,c),late=has&&!c.paid&&c.due&&c.due<today();h+=`<td class="${p===y*12+selectedMonth?'selected':''}"><button class="cell ${c.paid?'paid':late?'late':''}" data-row="${r.id}" data-month="${m}" data-year="${yr}" aria-label="${esc(r.name)}, ${periodLabel(p)}, ${has?fmt(total(r,c)):'sem lançamento'}, ${c.paid?'pago':late?'atrasado':'pendente'}">${has?`<span class="tick">${c.paid?'✓':late?'!':''}</span>${fmt(total(r,c))}`:'—'}</button></td>`}h+='</tr>'})});
 h+='</tbody><tfoot>';
 for(const [label,filter]of[['Receitas',r=>r.group===0],['Despesas',r=>r.group!==0],['Saldo previsto',()=>true]]){h+=`<tr><th>${label}</th>`;for(const p of periods){const t=rows.filter(filter).reduce((a,r)=>a+total(r,rec(r,p%12,Math.floor(p/12)))*(label==='Saldo previsto'&&r.group!==0?-1:1),0);h+=`<td>${fmt(t)}</td>`}h+='</tr>'}
 $('#budget').innerHTML=h+'</tfoot>';document.querySelectorAll('[data-row]').forEach(b=>b.onclick=()=>openEdit(+b.dataset.row,+b.dataset.month,+b.dataset.year));
}
function openEdit(id,m,y=Number($('#year').value)){active={row:rows.find(r=>r.id===id),m,y};draft=structuredClone(rec(active.row,m,y));$('#title').textContent=active.row.name;$('#period').textContent=`${months[m]} de ${active.y}`;const card=active.row.group===7;$('#delete-row').textContent=card?'Excluir cartão':'Excluir conta';$('#ordinary').hidden=card;$('#cardarea').hidden=!card;$('#value').value=draft.value??'';$('#manual').value=draft.manual??'';$('#due').value=draft.due;$('#status').value=draft.paid?'paid':'open';$('#actual').value=draft.actual??'';$('#paiddate').value=draft.paiddate;$('#purchaseTitle').value='';$('#purchaseValue').value='';$('#parts').value=1;$('#error').textContent='';payment();bill();$('#editor').showModal()}
function payment(){$('#payment').hidden=$('#status').value!=='paid'}function bill(){if(!active||active.row.group!==7)return;const sum=draft.purchases.reduce((a,b)=>a+b.cents,0)/100;const manual=$('#manual').value;$('#billstats').innerHTML=`Compras registradas: <strong>${fmt(sum)}</strong><br>Total no orçamento: <strong>${fmt(manual===''?sum:Number(manual))}</strong>${manual!==''?`<br>Diferença a conferir: <strong>${fmt(Number(manual)-sum)}</strong>`:''}`;$('#purchases').innerHTML=draft.purchases.map(p=>`<div class="purchase"><span>${esc(p.title)} · ${p.part}/${p.parts}</span><strong>${fmt(p.cents/100)}</strong></div>`).join('')}
$('#buy').onclick=()=>{const title=$('#purchaseTitle').value.trim(),v=Number($('#purchaseValue').value),n=Number($('#parts').value);if(!title||!Number.isFinite(v)||v<=0||!Number.isInteger(n)||n<1||n>48){$('#error').textContent='Informe a descrição, o valor e entre 1 e 48 parcelas.';return}const cents=Math.round(v*100);if(cents<n){$('#error').textContent='Cada parcela deve ter pelo menos R$ 0,01.';return}const group=crypto.randomUUID();for(let i=0;i<n;i++){const p={title,cents:Math.floor(cents/n)+(i<cents%n?1:0),part:i+1,parts:n,group,offset:i};if(i===0)draft.purchases.push(p);else(draft.future??=[]).push(p)}$('#purchaseTitle').value='';$('#purchaseValue').value='';$('#error').textContent='';$('#status').value='open';$('#actual').value='';$('#paiddate').value='';payment();bill();toast('Compra preparada. Salve para confirmar as parcelas.')};
$('#editform').onsubmit=e=>{e.preventDefault();const card=active.row.group===7;draft.value=$('#value').value===''?null:Number($('#value').value);draft.manual=$('#manual').value===''?null:Number($('#manual').value);draft.due=$('#due').value;draft.paid=$('#status').value==='paid';draft.actual=$('#actual').value===''?total(active.row,draft):Number($('#actual').value);draft.paiddate=$('#paiddate').value||(draft.paid?today():'');if(draft.paid&&!exists(active.row,draft)){$('#error').textContent='Informe um valor antes de marcar como pago.';return}const reopened=[];for(const p of draft.future||[]){const absolute=active.m+p.offset,y=active.y+Math.floor(absolute/12),m=absolute%12,k=key(active.row,m,String(y)),c=structuredClone(records[k]||blank());c.purchases.push(p);c.paid=false;c.actual=null;c.paiddate='';records[k]=c;if(archived.delete(y*12+m))reopened.push(y*12+m);if(!Array.from($('#year').options).some(o=>Number(o.value)===y))$('#year').add(new Option(String(y),String(y)))}delete draft.future;records[key(active.row,active.m,active.y)]=draft;if(!draft.paid&&exists(active.row,draft)&&archived.delete(active.y*12+active.m))reopened.push(active.y*12+active.m);$('#editor').close();render();toast(reopened.length?'Meses reabertos por novas pendências: '+reopened.map(periodLabel).join(', '):'Orçamento atualizado.')};
$('#status').onchange=payment;$('#manual').oninput=bill;$('#close').onclick=()=>$('#editor').close();$('#year').onchange=render;$('#month').onchange=()=>{selectedMonth=Number($('#month').value);render()};$('#add').onclick=()=>$('#new').showModal();$('#cancelnew').onclick=()=>$('#new').close();$('#newform').onsubmit=e=>{e.preventDefault();const name=$('#newname').value.trim();if(!name)return;rows.push({id:Math.max(0,...rows.map(r=>r.id))+1,name,group:Number($('#group').value)});$('#new').close();$('#newform').reset();render();toast('Adicionado. Clique no mês para preencher o valor.')};render();

$('#delete-row').onclick=()=>{
  if(!active)return;
  const {row,m}=active;
  $('#delete-description').textContent=`${row.name} · ${months[m]} de ${active.y}. Escolha quais lançamentos remover. Os meses anteriores e o cadastro serão preservados. No cartão, a exclusão inclui o total informado e todas as compras dos meses escolhidos.`;
  $('#delete-dialog').showModal();
};
function deleteEntries(future){
  if(!active)return;
  const {row,m,y:year}=active;
  const cutoff=year*12+m;
  for(const k of Object.keys(records)){
    const [id,y,month]=k.split('-').map(Number);
    if(id!==row.id)continue;
    const period=y*12+month;
    if(future?period>=cutoff:period===cutoff)delete records[k];
  }
  $('#delete-dialog').close();$('#editor').close();
  active=null;draft=null;render();
  toast(future?'Lançamentos deste mês em diante excluídos.':'Lançamento deste mês excluído.');
}
$('#delete-current').onclick=()=>deleteEntries(false);
$('#delete-future').onclick=()=>deleteEntries(true);
$('#delete-cancel').onclick=()=>$('#delete-dialog').close();

$('#show-archived').onchange=render;
$('#archive-month').onclick=()=>{
 const p=Number($('#year').value)*12+selectedMonth;
 if(archived.has(p)){archived.delete(p);render();toast('Mês reaberto.');return}
 if(!canArchive(p))return;
 if(!confirm(`Arquivar ${periodLabel(p)}? A coluna ficará oculta. O histórico e os totais serão preservados.`))return;
 archived.add(p);render();toast('Mês arquivado. Consulte em Mostrar meses arquivados.');
};
