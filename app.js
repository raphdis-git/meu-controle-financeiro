const $=s=>document.querySelector(s),fmt=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];const groups=['Renda familiar','Habitação','Saúde','Automóvel','Outras despesas','Lazer','Investimentos e compromissos','Cartões de crédito'];let selectedMonth=new Date().getMonth(),active=null,draft=null,editingRowId=null;const records={};const archived=new Set();
const rows=[['Salário Raphael',0,4200],['Salário Aira',0,2800],['Condomínio Apartamento',1,380],['Equatorial Apartamento',1,165],['Saneago Apartamento',1,85],['Internet',1,100],['Amil Dental Raphael',2,65],['Combustível',3,180],['IPVA Moto',3,55],['Academia / CrossFit',4,150],['Reserva de emergência',4,300],['Lanche',5,120],['Financiamento Apartamento',6,1100],['Nubank Raphael',7,450],['Nubank Aira',7,320],['BMG',7,140],['Renner',7,80],['Mercado Pago',7,180],['Caixa',7,210]].map((r,i)=>({id:i+1,name:r[0],group:r[1],example:r[2]}));
function key(r,m,y=$('#year').value){return `${r.id}-${y}-${m}`}function blank(){return{value:null,description:'',manual:null,paid:false,actual:null,due:'',paiddate:'',purchases:[]}}function rec(r,m,y){const saved=records[key(r,m,y)];if(saved)return saved;const period=Number(y??$('#year').value)*12+m,rule=recurrenceAt(r,period);return rule?{...blank(),value:rule.value,valueFormula:rule.formula,description:rule.description??'',due:recurringDue(period,rule.day)}:blank()}function total(r,c){return r.group===7?(c.manual!==null?c.manual:c.purchases.reduce((a,b)=>a+b.cents,0)/100):c.value??0}function exists(r,c){return r.group===7?c.manual!==null||c.purchases.length>0:c.value!==null}function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}let suppressToast=false,lastToast='';function toast(t){if(suppressToast){lastToast=t;return}$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',2400)}
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
 h+=`<tr><th><div class="row-heading"><span>${esc(r.name)}${recurrenceAt(r,y*12+selectedMonth)?'<small class="fixed-label">Conta fixa</small>':''}</span><button type="button" class="edit-name" data-edit-row="${r.id}" aria-label="Editar ${esc(r.name)}" title="Editar ${esc(r.name)}"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5"/></svg></button></div></th>`;
 for(const p of periods){const m=p%12,yr=Math.floor(p/12),c=rec(r,m,yr),has=exists(r,c),late=has&&!c.paid&&c.due&&c.due<today();h+=`<td class="${p===y*12+selectedMonth?'selected':''}"><button class="cell ${c.paid?'paid':late?'late':''}" data-row="${r.id}" data-month="${m}" data-year="${yr}" aria-label="${esc(r.name)}, ${periodLabel(p)}, ${has?fmt(total(r,c)):'sem lançamento'}, ${c.paid?'pago':late?'atrasado':'pendente'}">${has?`<span class="tick">${c.paid?'✓':late?'!':''}</span>${fmt(total(r,c))}`:'—'}</button></td>`}h+='</tr>'})});
 h+='</tbody><tfoot>';
 for(const [label,filter]of[['Receitas',r=>r.group===0],['Despesas',r=>r.group!==0],['Saldo previsto',()=>true]]){h+=`<tr><th>${label}</th>`;for(const p of periods){const t=rows.filter(filter).reduce((a,r)=>a+total(r,rec(r,p%12,Math.floor(p/12)))*(label==='Saldo previsto'&&r.group!==0?-1:1),0);h+=`<td>${fmt(t)}</td>`}h+='</tr>'}
 $('#budget').innerHTML=h+'</tfoot>';document.querySelectorAll('[data-edit-row]').forEach(b=>b.onclick=()=>openRowEdit(Number(b.dataset.editRow)));document.querySelectorAll('[data-row]').forEach(b=>b.onclick=()=>openEdit(+b.dataset.row,+b.dataset.month,+b.dataset.year));
}
function openEdit(id,m,y=Number($('#year').value)){active={row:rows.find(r=>r.id===id),m,y};draft=structuredClone(rec(active.row,m,y));$('#title').textContent=active.row.name;$('#account-description-text').textContent=active.row.description??'';$('#account-description-panel').hidden=!(active.row.description??'').trim();$('#period').textContent=`${months[m]} de ${active.y}`;const card=active.row.group===7;$('#delete-row').textContent=card?'Excluir cartão':'Excluir conta';$('#ordinary').hidden=card;$('#cardarea').hidden=!card;$('#value').value=draft.valueFormula??draft.value??'';previewExpectedValue();$('#entry-description').value=draft.description??'';$('#manual').value=draft.manual??'';$('#due').value=draft.due;$('#status').value=draft.paid?'paid':'open';$('#actual').value=draft.actual??'';$('#paiddate').value=draft.paiddate;$('#purchaseTitle').value='';$('#purchaseValue').value='';$('#parts').value=1;$('#error').textContent='';setupRepeatEditor();payment();bill();$('#editor').showModal()}
function payment(){$('#payment').hidden=$('#status').value!=='paid'}function bill(){if(!active||active.row.group!==7)return;const sum=draft.purchases.reduce((a,b)=>a+b.cents,0)/100;const manual=$('#manual').value;$('#billstats').innerHTML=`Compras registradas: <strong>${fmt(sum)}</strong><br>Total no orçamento: <strong>${fmt(manual===''?sum:Number(manual))}</strong>${manual!==''?`<br>Diferença a conferir: <strong>${fmt(Number(manual)-sum)}</strong>`:''}`;$('#purchases').innerHTML=draft.purchases.map(p=>`<div class="purchase"><span>${esc(p.title)} · ${p.part}/${p.parts}</span><strong>${fmt(p.cents/100)}</strong></div>`).join('')}
$('#buy').onclick=()=>{const title=$('#purchaseTitle').value.trim(),v=Number($('#purchaseValue').value),n=Number($('#parts').value);if(!title||!Number.isFinite(v)||v<=0||!Number.isInteger(n)||n<1||n>48){$('#error').textContent='Informe a descrição, o valor e entre 1 e 48 parcelas.';return}const cents=Math.round(v*100);if(cents<n){$('#error').textContent='Cada parcela deve ter pelo menos R$ 0,01.';return}const group=crypto.randomUUID();for(let i=0;i<n;i++){const p={title,cents:Math.floor(cents/n)+(i<cents%n?1:0),part:i+1,parts:n,group,offset:i};if(i===0)draft.purchases.push(p);else(draft.future??=[]).push(p)}$('#purchaseTitle').value='';$('#purchaseValue').value='';$('#error').textContent='';$('#status').value='open';$('#actual').value='';$('#paiddate').value='';payment();bill();toast('Compra preparada. Salve para confirmar as parcelas.')};
$('#editform').onsubmit=e=>{e.preventDefault();const card=active.row.group===7;const description=$('#entry-description').value;if(description.length>2000){$('#error').textContent='A descrição deve ter no máximo 2.000 caracteres.';return}draft.description=description;if(!card){let parsed;try{parsed=parseExpectedValue($('#value').value)}catch(error){$('#error').textContent=error.message;previewExpectedValue();return}draft.value=parsed.value;draft.valueFormula=parsed.formula;}draft.manual=$('#manual').value===''?null:Number($('#manual').value);draft.due=$('#due').value;draft.paid=$('#status').value==='paid';draft.actual=$('#actual').value===''?total(active.row,draft):Number($('#actual').value);draft.paiddate=$('#paiddate').value||(draft.paid?today():'');if(draft.paid&&!exists(active.row,draft)){$('#error').textContent='Informe um valor antes de marcar como pago.';return}const reopened=[];if(!card&&!applyRepeatEdit(reopened))return;for(const p of draft.future||[]){const absolute=active.m+p.offset,y=active.y+Math.floor(absolute/12),m=absolute%12,k=key(active.row,m,String(y)),c=structuredClone(records[k]||blank());c.purchases.push(p);c.paid=false;c.actual=null;c.paiddate='';records[k]=c;if(archived.delete(y*12+m))reopened.push(y*12+m);if(!Array.from($('#year').options).some(o=>Number(o.value)===y))$('#year').add(new Option(String(y),String(y)))}delete draft.future;records[key(active.row,active.m,active.y)]=draft;if(!draft.paid&&exists(active.row,draft)&&archived.delete(active.y*12+active.m))reopened.push(active.y*12+active.m);reopenRecurringMonths(active.row,reopened);$('#editor').close();render();toast(reopened.length?'Meses reabertos por novas pendências: '+reopened.map(periodLabel).join(', '):'Orçamento atualizado.')};
$('#status').onchange=payment;$('#manual').oninput=bill;$('#close').onclick=()=>$('#editor').close();$('#year').onchange=render;$('#month').onchange=()=>{selectedMonth=Number($('#month').value);render()};$('#add').onclick=()=>{$('#new-error').textContent='';$('#new').showModal()};$('#cancelnew').onclick=()=>$('#new').close();$('#newform').onsubmit=e=>{
 e.preventDefault();const name=$('#newname').value.trim();if(!name)return;
 rows.push({id:Math.max(0,...rows.map(r=>r.id))+1,name,group:Number($('#group').value)});
 $('#new').close();$('#newform').reset();render();toast('Conta cadastrada.');
};render();

$('#delete-row').onclick=()=>{
  if(!active)return;
  const {row,m}=active;
  $('#delete-description').textContent=`${row.name} · ${months[m]} de ${active.y}. Escolha quais lançamentos remover. Os meses anteriores e o cadastro serão preservados. Em contas fixas, excluir os próximos meses encerra a repetição. No cartão, a exclusão inclui a fatura e suas compras.`;
  $('#delete-dialog').showModal();
};
function deleteEntries(future){
  if(!active)return;
  const {row,m,y:year}=active;
  const cutoff=year*12+m;
  if(future)stopRecurrences(row,cutoff);
  for(const k of Object.keys(records)){
    const [id,y,month]=k.split('-').map(Number);
    if(id!==row.id)continue;
    const period=y*12+month;
    if(future?period>=cutoff:period===cutoff)delete records[k];
  }
  if(!future&&recurrenceAt(row,cutoff))records[key(row,m,year)]={...blank(),excluded:true};
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

function allowedRowGroups(row){return groups.map((_,i)=>i).filter(i=>row.group===7?i===7:i<7)}
function openRowEdit(id){
 const row=rows.find(r=>r.id===id);if(!row)return;
 editingRowId=id;
 $('#row-editor-title').textContent=row.group===7?'Editar cartão':'Editar conta';
 $('#row-name').value=row.name;$('#row-description').value=row.description??'';
 $('#row-group').innerHTML=allowedRowGroups(row).map(i=>`<option value="${i}">${groups[i]}</option>`).join('');
 $('#row-group').value=String(row.group);$('#row-group').disabled=row.group===7;
 $('#row-edit-help').textContent=row.group===7?'O nome será atualizado em todas as faturas. As compras e parcelas serão preservadas.':'O nome e a categoria serão atualizados em todos os meses. Mover entre renda e despesa altera os totais, preservando os valores e pagamentos.';
 $('#row-edit-error').textContent='';$('#row-editor').showModal();
}
$('#row-edit-cancel').onclick=()=>{$('#row-editor').close();editingRowId=null};
$('#row-edit-form').onsubmit=e=>{
 e.preventDefault();
 const row=rows.find(r=>r.id===editingRowId);if(!row)return;
 const name=$('#row-name').value.trim(),group=Number($('#row-group').value);
 if(!name||name.length>120){$('#row-edit-error').textContent='Informe um nome de até 120 caracteres.';return}
 if(!allowedRowGroups(row).includes(group)){$('#row-edit-error').textContent='Selecione uma categoria válida para esta conta.';return}
 const description=$('#row-description').value;if(description.length>2000){$('#row-edit-error').textContent='A descrição deve ter no máximo 2.000 caracteres.';return}row.name=name;row.group=group;row.description=description;
 const reopened=[];reopenRecurringMonths(row,reopened);$('#row-editor').close();render();toast(reopened.length?'Cadastro atualizado. Meses reabertos por pendências: '+reopened.map(periodLabel).join(', '):'Cadastro atualizado.');
};

// Restricted sums, evaluated in integer cents. Never execute user input as code.
function parseExpectedValue(input){
 const text=String(input).trim();
 if(!text)return {value:null,formula:null};
 if(text.length>500)throw Error('Use uma soma de até 500 caracteres.');
 const formula=text.startsWith('=')?text:null;
 const parts=(formula?text.slice(1):text).split('+');
 if(!formula&&parts.length>1)throw Error('Comece com = para calcular uma soma.');
 let cents=0;
 for(const part of parts){
  let number=part.trim();
  if(!/^(?:\d+(?:,\d{1,2})?|\d+\.\d{1,2}|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)$/.test(number))throw Error('Confira a soma. Use apenas valores com até dois centavos separados por +. Ex.: =1500+250,50.');
  if(number.includes(',')||/^\d{1,3}(?:\.\d{3})+$/.test(number))number=number.replaceAll('.','').replace(',','.');
  const [whole,decimal='']=number.split('.');
  const term=Number(whole)*100+Number(decimal.padEnd(2,'0'));
  if(!Number.isSafeInteger(term)||!Number.isSafeInteger(cents+term))throw Error('O valor informado é muito alto.');
  cents+=term;
 }
 return {value:cents/100,formula};
}
function previewExpectedValue(){
 const output=$('#value-result');
 try{const parsed=parseExpectedValue($('#value').value);output.textContent=parsed.value===null?'':`Resultado: ${fmt(parsed.value)}`;output.classList.remove('invalid')}
 catch(error){output.textContent=error.message;output.classList.add('invalid')}
}
$('#value').oninput=previewExpectedValue;

function recurrenceAt(row,period){return (row.recurrences||[]).find(rule=>period>=rule.start&&(rule.end===null||period<=rule.end))}
function recurringDue(period,day){const y=Math.floor(period/12),m=period%12;const last=new Date(y,m+1,0).getDate();return `${y}-${String(m+1).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`}
function stopRecurrences(row,period){row.recurrences=(row.recurrences||[]).filter(r=>r.start<period).map(r=>({...r,end:r.end===null?period-1:Math.min(r.end,period-1)}))}
function reopenRecurringMonths(row,reopened){for(const period of [...archived]){const c=rec(row,period%12,Math.floor(period/12));if(row.group!==0&&exists(row,c)&&!c.paid){archived.delete(period);if(!reopened.includes(period))reopened.push(period)}}}
function setupRepeatEditor(){
 const rule=recurrenceAt(active.row,active.y*12+active.m);
 $('#repeat-edit').hidden=active.row.group===7;
 $('#repeat-monthly').checked=!!rule;$('#repeat-monthly').disabled=!!rule;
 $('#repeat-scope').value='current';$('#repeat-scope-label').hidden=!rule;
 $('#repeat-help').textContent=rule?'O pagamento vale somente para este mês. Para encerrar a repetição, use Excluir e escolha este mês e os próximos.':'A repetição começa neste mês. Informe valor e vencimento; os próximos lançamentos ficam pendentes.';
}
function applyRepeatEdit(reopened){
 const row=active.row,period=active.y*12+active.m,old=recurrenceAt(row,period);
 const future=old?$('#repeat-scope').value==='future':$('#repeat-monthly').checked;
 if(!future)return true;
 const previousDue=rec(row,active.m,active.y).due;
 const day=old&&previousDue===draft.due?old.day:Number(draft.due.split('-')[2]);
 if(draft.value===null||!draft.due||!Number.isInteger(day)||day<1||day>31||draft.due.slice(0,7)!==`${active.y}-${String(active.m+1).padStart(2,'0')}`){$('#error').textContent='Para repetir, informe o valor e um vencimento dentro do mês selecionado.';return false}
 stopRecurrences(row,period);
 row.recurrences.push({start:period,end:null,value:draft.value,formula:draft.valueFormula,description:draft.description,day});
 // Existing paid entries and explicit exclusions are never overwritten by a price change.
 if(old)for(const k of Object.keys(records)){const [id,y,m]=k.split('-').map(Number);if(id===row.id&&y*12+m>period&&!records[k].paid&&!records[k].excluded)delete records[k]}
 return true;
}
