// All UI rendering, modal handling, tab routing, and feature logic.
// Depends on storage.js (KEYS, saveData, loadData, getActiveTrip, fmt, etc.).

// ===== TOAST =====
function showToast(msg,type='info'){
  const c=document.getElementById('toast-container');
  const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;
  c.appendChild(t);requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400)},3000);
  const toasts=c.querySelectorAll('.toast');if(toasts.length>3)toasts[0].remove();
}

// ===== MODAL =====
function openModal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden'}
function closeModal(id){document.getElementById(id).classList.remove('open');document.body.style.overflow=''}
function backdropClose(e,id){if(e.target===document.getElementById(id))closeModal(id)}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal-backdrop.open').forEach(m=>m.classList.remove('open'));document.body.style.overflow='';closePanel()}});

// ===== TABS =====
let activeTab='trips';
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(!btn.dataset.tab)return;
    setActiveTab(btn.dataset.tab);
  });
});
function setActiveTab(tab){
  activeTab=tab;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  renderTab(tab);
}
function renderTab(tab){
  if(tab==='trips')renderTrips();
  else if(tab==='itinerary')renderItinerary();
  else if(tab==='budget')renderBudget();
  else if(tab==='events')renderEvents();
  else if(tab==='places')renderPlaces();
  else if(tab==='calendar')renderCalendar();
  else if(tab==='docs')renderDocs();
}

// ===== FAB =====
function fabClick(){
  const map={trips:'modal-trip',itinerary:'modal-stop',budget:'modal-expense',events:'modal-event',places:'modal-place',calendar:'modal-event'};
  const m=map[activeTab];if(!m)return;
  if(activeTab==='budget'){openExpenseModal();return}
  if(activeTab==='itinerary'){openStopModal();return}
  openModal(m);
  if(m==='modal-event')populateTripSelects();
  if(m==='modal-place')populateTripSelects();
}

// ===== NAV =====
function updateNavTrip(){
  const t=getActiveTrip();const r=document.getElementById('nav-right');
  const tripPill=t?`<div class="active-trip-pill"><span>${t.name}</span><button onclick="deselectTrip()" title="Deselect trip">✕</button></div>`:'';
  const settingsBtn=`<div class="settings-wrap">
    <button class="settings-btn" onclick="toggleSettings(event)" title="Settings" aria-label="Settings">⚙</button>
    <div class="settings-menu" id="settings-menu">
      <div class="settings-section">
        <div class="settings-label">Backup</div>
        <button class="settings-action" onclick="exportData()">⬇ Export data</button>
        <button class="settings-action" onclick="document.getElementById('import-file-input').click()">⬆ Import data</button>
        <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="importData(this)">
      </div>
    </div>
  </div>`;
  r.innerHTML=`${settingsBtn}${tripPill}`;
}
function deselectTrip(){localStorage.removeItem(KEYS.active);updateNavTrip();renderItinerary();renderBudget();renderTrips();if(activeTab==='docs')renderDocs()}

// ===== SETTINGS DROPDOWN =====
function toggleSettings(e){
  e.stopPropagation();
  const menu=document.getElementById('settings-menu');
  if(!menu)return;
  menu.classList.toggle('open');
}
document.addEventListener('click',e=>{
  const menu=document.getElementById('settings-menu');
  if(menu&&menu.classList.contains('open')&&!e.target.closest('.settings-wrap')){
    menu.classList.remove('open');
  }
});

// ===== MORE SHEET (bottom tab bar overflow) =====
function toggleMoreSheet(e){
  if(e)e.stopPropagation();
  document.getElementById('more-sheet-backdrop').classList.toggle('open');
}
function closeMoreSheet(e){
  if(e&&e.target!==e.currentTarget&&!e.target.closest('.more-sheet-item'))return;
  document.getElementById('more-sheet-backdrop').classList.remove('open');
}
function deSelectFromCard(){deselectTrip()}
function tripXClick(id,btn){
  if(btn.dataset.confirming==='1'){deleteTrip(id);return;}
  btn.dataset.confirming='1';
  btn.textContent='Sure?';
  btn.style.width='52px';btn.style.borderRadius='10px';btn.style.background='var(--danger)';btn.style.color='var(--white)';
  setTimeout(()=>{if(btn.dataset.confirming==='1'){btn.dataset.confirming='';btn.textContent='✕';btn.style.width='';btn.style.borderRadius='';btn.style.background='';btn.style.color=''}},2500);
}

// ===== COLOR SWATCHES =====
let selectedColor=0;
let selectedCoverImage=null;
function renderSwatches(){
  const wrap=document.getElementById('color-swatches');
  wrap.innerHTML=[0,1,2,3,4,5,6,7].map(i=>`<div class="color-swatch cg-${i} ${i===selectedColor?'selected':''}" onclick="pickColor(${i})"></div>`).join('');
}
function pickColor(i){selectedColor=i;renderSwatches()}
function handleCoverImage(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    selectedCoverImage=ev.target.result;
    const prev=document.getElementById('cover-img-preview');
    prev.innerHTML=`<img src="${selectedCoverImage}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`;
    document.getElementById('cover-img-clear').style.display='';
  };
  reader.readAsDataURL(file);
}
function clearCoverImage(){
  selectedCoverImage=null;
  document.getElementById('cover-img-preview').innerHTML='🖼';
  document.getElementById('cover-img-clear').style.display='none';
}

// ===== TRIPS =====
let editingTripId=null;
let justSavedTripId=null;
function openTripModal(id=null){
  editingTripId=id;selectedColor=0;
  const t=id?loadData(KEYS.trips).find(x=>x.id===id):null;
  document.getElementById('modal-trip-title').textContent=id?'Edit Trip':'New Trip';
  document.getElementById('f-trip-name').value=t?.name||'';
  document.getElementById('f-trip-dest').value=t?.destination||'';
  document.getElementById('f-trip-country').value=t?.country||'';
  document.getElementById('f-trip-cat').value=t?.category||'City 🏙';
  document.getElementById('f-trip-start').value=t?.startDate||'';
  document.getElementById('f-trip-end').value=t?.endDate||'';
  document.getElementById('f-trip-budget').value=t?.totalBudget||'';
  // Currency selector — populate options, preselect trip's currency or current default
  const curSel=document.getElementById('f-trip-currency');
  const tripCur=t?.currency||activeCurrency;
  curSel.innerHTML=Object.entries(CURRENCIES).map(([k,v])=>`<option value="${k}" ${k===tripCur?'selected':''}>${k} ${v.symbol}</option>`).join('');
  document.getElementById('f-trip-notes').value=t?.notes||'';
  selectedColor=t?.coverColor??0;
  selectedCoverImage=t?.coverImage||null;
  const prev=document.getElementById('cover-img-preview');
  const clrBtn=document.getElementById('cover-img-clear');
  if(selectedCoverImage){prev.innerHTML=`<img src="${selectedCoverImage}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`;clrBtn.style.display='';}
  else{prev.innerHTML='🖼';clrBtn.style.display='none';}
  renderSwatches();openModal('modal-trip');
}
function saveTrip(){
  const name=document.getElementById('f-trip-name').value.trim();
  const dest=document.getElementById('f-trip-dest').value.trim();
  const start=document.getElementById('f-trip-start').value;
  const end=document.getElementById('f-trip-end').value;
  let ok=true;
  if(!name){shake('f-trip-name');ok=false}
  if(!dest){shake('f-trip-dest');ok=false}
  if(!start){shake('f-trip-start');ok=false}
  if(!end){shake('f-trip-end');ok=false}
  if(!ok)return;
  const trips=loadData(KEYS.trips);
  const tripCurrency=document.getElementById('f-trip-currency').value||'USD';
  const obj={
    id:editingTripId||generateId(),name,destination:dest,
    country:document.getElementById('f-trip-country').value.trim(),
    category:document.getElementById('f-trip-cat').value,
    startDate:start,endDate:end,
    totalBudget:parseFloat(document.getElementById('f-trip-budget').value)||0,
    currency:tripCurrency,
    coverColor:selectedColor,
    coverImage:selectedCoverImage||null,
    notes:document.getElementById('f-trip-notes').value.trim()
  };
  if(editingTripId){const i=trips.findIndex(t=>t.id===editingTripId);trips[i]=obj}
  else trips.push(obj);
  const savedId=obj.id;
  editingTripId=null;
  try{saveData(KEYS.trips,trips)}catch(e){showToast('Storage full — try removing the cover image','error');return}
  // Apply this trip's currency globally so the Budget/Expenses tabs show in the right symbol
  if(tripCurrency!==activeCurrency){activeCurrency=tripCurrency;localStorage.setItem('voyage_currency',tripCurrency);updateCurrencyPrefixes();}
  justSavedTripId=savedId;
  closeModal('modal-trip');renderTrips();showToast('Trip saved!','success');
  setTimeout(()=>{justSavedTripId=null},1000);
  updateNavTrip();
}
function deleteTrip(id){
  const trips=loadData(KEYS.trips).filter(t=>t.id!==id);saveData(KEYS.trips,trips);
  if(localStorage.getItem(KEYS.active)===id)localStorage.removeItem(KEYS.active);
  saveData(KEYS.docs,loadData(KEYS.docs).filter(d=>d.tripId!==id));
  renderTrips();updateNavTrip();showToast('Trip deleted','error');
}
function renderTrips(){
  const trips=loadData(KEYS.trips);
  const expenses=loadData(KEYS.expenses);
  const el=document.getElementById('trips-list');
  if(!trips.length){
    el.innerHTML=`<div class="empty-state">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="10" y="28" width="60" height="40" rx="6"/><path d="M26 28V20a14 14 0 0128 0v8"/><line x1="40" y1="44" x2="40" y2="52"/><line x1="36" y1="48" x2="44" y2="48"/>
      </svg>
      <h3>No trips yet</h3><p>Start planning your first adventure.</p>
      <button class="btn btn-primary" onclick="openTripModal()">+ New Trip</button></div>`;
    return;
  }
  el.innerHTML=`<div class="cards-grid">${trips.map(t=>{
    const spent=expenses.filter(e=>e.tripId===t.id).reduce((s,e)=>s+e.amount,0);
    const pct=t.totalBudget?Math.min(100,(spent/t.totalBudget)*100):0;
    const barColor=pct>=100?'var(--danger)':pct>=70?'var(--warning)':'var(--success)';
    return`<div class="card${t.id===justSavedTripId?' just-added':''}" style="cursor:pointer" onclick="selectTrip('${t.id}',event)">
      <div class="card-actions">
        <button class="icon-btn" onclick="event.stopPropagation();openTripModal('${t.id}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="event.stopPropagation();confirmDelete('trip','${t.id}',event)" title="Delete">🗑</button>
      </div>
      <button class="trip-deselect-btn" id="xbtn-${t.id}" onclick="event.stopPropagation();tripXClick('${t.id}',this)" title="Remove trip">✕</button>
      <div class="trip-card-header cg-${t.coverColor}" style="${t.coverImage?`background-image:url('${t.coverImage}');background-size:cover;background-position:center`:''}"></div>
      <div class="trip-card-body">
        <div class="trip-dest">${esc(t.destination)}</div>
        <div class="trip-country">${esc(t.country)}</div>
        <span class="tag-pill cat">${t.category}</span>
        <div class="trip-dates">${formatDateRange(t.startDate,t.endDate)}</div>
        <div class="trip-days">${daysBetween(t.startDate,t.endDate)} days</div>
        ${t.totalBudget?`<div class="progress-wrap"><div class="progress-label"><span>${esc(t.name)}</span><span class="mono">${fmt(spent)} / ${fmt(t.totalBudget)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div></div>`:''}
      </div>
    </div>`;
  }).join('')}</div>`;
}
function selectTrip(id,e){
  if(e.target.closest('.card-actions,.del-confirm'))return;
  setActiveTrip(id);
  setActiveTab('itinerary');
  showToast('Trip selected!','info');
}

// ===== ITINERARY =====
let editingStopId=null;
function openStopModal(id=null){
  const trip=getActiveTrip();
  if(!trip){showToast('Select a trip first','error');return}
  editingStopId=id;
  const s=id?loadData(KEYS.stops).find(x=>x.id===id):null;
  document.getElementById('modal-stop-title').textContent=id?'Edit Stop':'Add Stop';
  document.getElementById('f-stop-day').value=s?.day||1;
  document.getElementById('f-stop-time').value=s?.time||'';
  document.getElementById('f-stop-name').value=s?.placeName||'';
  document.getElementById('f-stop-addr').value=s?.address||'';
  document.getElementById('f-stop-maps').value=s?.googleMapsLink||'';
  document.getElementById('f-stop-cat').value=s?.category||'Attraction';
  document.getElementById('f-stop-notes').value=s?.notes||'';
  openModal('modal-stop');
}
function saveStop(){
  const name=document.getElementById('f-stop-name').value.trim();
  const day=parseInt(document.getElementById('f-stop-day').value);
  if(!name){shake('f-stop-name');return}
  if(!day||day<1){shake('f-stop-day');return}
  const trip=getActiveTrip();if(!trip)return;
  const stops=loadData(KEYS.stops);
  const obj={
    id:editingStopId||generateId(),tripId:trip.id,day,
    time:document.getElementById('f-stop-time').value,
    placeName:name,address:document.getElementById('f-stop-addr').value.trim(),
    googleMapsLink:document.getElementById('f-stop-maps').value.trim(),
    category:document.getElementById('f-stop-cat').value,
    notes:document.getElementById('f-stop-notes').value.trim(),
    order:editingStopId?(stops.find(s=>s.id===editingStopId)?.order||0):Date.now()
  };
  if(editingStopId){const i=stops.findIndex(s=>s.id===editingStopId);stops[i]=obj}
  else stops.push(obj);
  editingStopId=null;
  saveData(KEYS.stops,stops);closeModal('modal-stop');renderItinerary();showToast('Stop saved!','success');
}
function deleteStop(id){const stops=loadData(KEYS.stops).filter(s=>s.id!==id);saveData(KEYS.stops,stops);renderItinerary();showToast('Stop deleted','error')}
function reorderStop(id,dir){
  const trip=getActiveTrip();if(!trip)return;
  const stops=loadData(KEYS.stops);
  const s=stops.find(x=>x.id===id);if(!s)return;
  const dayStops=stops.filter(x=>x.tripId===trip.id&&x.day===s.day).sort((a,b)=>a.order-b.order);
  const idx=dayStops.findIndex(x=>x.id===id);
  const swapIdx=dir==='up'?idx-1:idx+1;
  if(swapIdx>=0&&swapIdx<dayStops.length){
    const tmp=dayStops[idx].order;dayStops[idx].order=dayStops[swapIdx].order;dayStops[swapIdx].order=tmp;
    dayStops.forEach(ds=>{const i=stops.findIndex(x=>x.id===ds.id);if(i>=0)stops[i]=ds});
  } else {
    const allDays=[...new Set(stops.filter(x=>x.tripId===trip.id).map(x=>x.day))].sort((a,b)=>a-b);
    const dayIdx=allDays.indexOf(s.day);
    const targetDay=dir==='up'?allDays[dayIdx-1]:allDays[dayIdx+1];
    if(targetDay==null)return;
    const si=stops.findIndex(x=>x.id===id);
    stops[si].day=targetDay;
    const targetStops=stops.filter(x=>x.tripId===trip.id&&x.day===targetDay);
    const orders=targetStops.map(x=>x.order);
    stops[si].order=dir==='up'?(orders.length?Math.max(...orders)+1:Date.now()):(orders.length?Math.min(...orders)-1:Date.now());
  }
  saveData(KEYS.stops,stops);renderItinerary();
}
const catIcons={Food:'🍽',Hotel:'🏨',Attraction:'🎯',Transport:'🚌',Event:'🎟',Shopping:'🛍'};
const catClasses={Food:'cat-food',Hotel:'cat-hotel',Attraction:'cat-attraction',Transport:'cat-transport',Event:'cat-event',Shopping:'cat-shopping'};
function renderItinerary(){
  const trip=getActiveTrip();
  const el=document.getElementById('itinerary-content');
  if(!trip){el.innerHTML=`<div class="require-trip"><h3>No trip selected</h3><p>Select a trip from the Trips tab to view its itinerary.</p></div>`;return}
  const stops=loadData(KEYS.stops).filter(s=>s.tripId===trip.id);
  el.innerHTML=`<div class="section-header"><h2 class="section-title">${esc(trip.name)} — Itinerary</h2><button class="btn btn-primary mobile-hidden" onclick="openStopModal()">+ Add Stop</button></div>`;
  if(!stops.length){
    el.innerHTML+=`<div class="empty-state"><svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="32" r="14"/><path d="M40 46v20M40 46l-12 8M40 46l12 8"/><circle cx="40" cy="32" r="4" fill="currentColor"/></svg><h3>No stops yet</h3><p>Add your first stop to build your itinerary.</p></div>`;
    return;
  }
  const days=[...new Set(stops.map(s=>s.day))].sort((a,b)=>a-b);
  const tripStart=trip.startDate;
  days.forEach((day,di)=>{
    const dayDate=tripStart?new Date(new Date(tripStart+'T00:00:00').getTime()+(day-1)*86400000):null;
    const dayLabel=dayDate?`${getDayOfWeek(dayDate.toISOString().split('T')[0])}, ${formatDate(dayDate.toISOString().split('T')[0])}`:'';
    const dayStops=stops.filter(s=>s.day===day).sort((a,b)=>a.order-b.order);
    const sec=document.createElement('div');sec.className='day-section';
    sec.innerHTML=`<div class="day-header">Day ${day}${dayLabel?' — '+dayLabel:''}</div><div class="timeline" id="day-${day}-timeline"></div>`;
    el.appendChild(sec);
    const tl=sec.querySelector(`#day-${day}-timeline`);
    dayStops.forEach((s,si)=>{
      const mapId='map-'+s.id;
      const item=document.createElement('div');item.className='stop-item';item.style.animationDelay=(si*80)+'ms';
      item.innerHTML=`<div class="stop-dot"></div>
        <div class="stop-card">
          <div class="card-actions">
            <button class="icon-btn" onclick="openStopModal('${s.id}')" title="Edit">✏️</button>
            <button class="icon-btn" onclick="confirmDelete('stop','${s.id}',event)" title="Delete">🗑</button>
          </div>
          <div style="display:flex;align-items:flex-start;gap:8px">
            <div class="category-badge ${catClasses[s.category]||'cat-attraction'}">${catIcons[s.category]||'📍'}</div>
            <div style="flex:1">
              ${s.time?`<div class="stop-time">${fmtTime(s.time)}</div>`:''}
              <div class="stop-name">${esc(s.placeName)}</div>
              ${s.address?`<div class="stop-addr">${esc(s.address)}</div>`:''}
              ${s.notes?`<div class="stop-notes">${esc(s.notes)}</div>`:''}
              ${s.address||s.googleMapsLink?`<button class="map-toggle" onclick="toggleMap('${mapId}')">🗺 View on Map</button><div class="map-frame" id="${mapId}"><iframe src="https://maps.google.com/maps?q=${encodeURIComponent(s.address||s.placeName)}&output=embed" width="100%" height="200" style="border:0;border-radius:10px" loading="lazy" allowfullscreen></iframe></div>`:''}
              <div class="reorder-btns">
                <button class="reorder-btn" onclick="reorderStop('${s.id}','up')" title="Move up">▲</button>
                <button class="reorder-btn" onclick="reorderStop('${s.id}','down')" title="Move down">▼</button>
              </div>
            </div>
          </div>
        </div>`;
      tl.appendChild(item);
    });
  });
}
function toggleMap(id){const f=document.getElementById(id);f.classList.toggle('open')}
function fmtTime(t){if(!t)return'';const[h,m]=t.split(':');const hr=parseInt(h);return`${hr%12||12}:${m} ${hr<12?'AM':'PM'}`}

// ===== BUDGET =====
const budgetCats=[{id:'Accommodation',icon:'🏨'},{id:'Food and Drink',icon:'🍽'},{id:'Transport',icon:'🚌'},{id:'Activities',icon:'🎯'},{id:'Sports',icon:'🏆'},{id:'Shopping',icon:'🛍'},{id:'Misc',icon:'📦'}];
let editingExpId=null;
function openExpenseModal(id=null,cat=null){
  const trip=getActiveTrip();if(!trip){showToast('Select a trip first','error');return}
  editingExpId=id;
  const e=id?loadData(KEYS.expenses).find(x=>x.id===id):null;
  document.getElementById('f-exp-name').value=e?.name||'';
  document.getElementById('f-exp-amount').value=e?.amount||'';
  document.getElementById('f-exp-date').value=e?.date||todayStr();
  document.getElementById('f-exp-cat').value=e?.category||cat||'Misc';
  document.getElementById('f-exp-notes').value=e?.notes||'';
  openModal('modal-expense');
}
function saveExpense(){
  const name=document.getElementById('f-exp-name').value.trim();
  const amount=parseFloat(document.getElementById('f-exp-amount').value);
  if(!name){shake('f-exp-name');return}
  if(!amount||amount<=0){shake('f-exp-amount');return}
  const trip=getActiveTrip();if(!trip)return;
  const expenses=loadData(KEYS.expenses);
  const obj={
    id:editingExpId||generateId(),tripId:trip.id,name,amount,
    category:document.getElementById('f-exp-cat').value,
    date:document.getElementById('f-exp-date').value||todayStr(),
    notes:document.getElementById('f-exp-notes').value.trim()
  };
  if(editingExpId){const i=expenses.findIndex(e=>e.id===editingExpId);expenses[i]=obj}
  else expenses.push(obj);
  editingExpId=null;
  saveData(KEYS.expenses,expenses);closeModal('modal-expense');renderBudget();showToast('Expense saved!','success');
}
function deleteExpense(id){const e=loadData(KEYS.expenses).filter(x=>x.id!==id);saveData(KEYS.expenses,e);renderBudget();showToast('Expense deleted','error')}
function setBudgetForCat(tripId,cat,amount){
  const budgets=loadData(KEYS.budgets);
  const existing=budgets.findIndex(b=>b.tripId===tripId&&b.category===cat);
  if(existing>=0)budgets[existing].budgetAmount=amount;
  else budgets.push({id:generateId(),tripId,category:cat,budgetAmount:amount});
  saveData(KEYS.budgets,budgets);
}
function renderBudget(){
  const trip=getActiveTrip();
  const el=document.getElementById('budget-content');
  if(!trip){el.innerHTML=`<div class="require-trip"><h3>No trip selected</h3><p>Select a trip from the Trips tab to manage budget.</p></div>`;return}
  const expenses=loadData(KEYS.expenses).filter(e=>e.tripId===trip.id);
  const totalSpent=expenses.reduce((s,e)=>s+e.amount,0);
  const totalBudget=trip.totalBudget||0;
  const tripDays=daysBetween(trip.startDate,trip.endDate)||0;
  const remaining=totalBudget-totalSpent;
  const spentOver=totalBudget>0&&totalSpent>totalBudget;
  const remNeg=remaining<0;
  const spentBg=totalBudget>0?(spentOver?'background:var(--danger);':'background:var(--success);'):'';
  const remBg=totalBudget>0?(remNeg?'background:var(--danger);':'background:var(--success);'):'';
  const spentTxt=totalBudget>0?'color:#fff':'';
  const remTxt=totalBudget>0?'color:#fff':'';
  el.innerHTML=`<div class="section-header"><h2 class="section-title">${esc(trip.name)} — Budget</h2><button class="btn btn-primary mobile-hidden" onclick="openExpenseModal()">+ Add Expense</button></div>
  <div class="budget-summary" style="grid-template-columns:repeat(5,1fr)">
    <div class="stat-card" style="background:var(--gold);border-radius:16px"><div class="stat-label" style="color:#fff">Total Budget</div><div class="stat-value mono" style="color:#fff">${fmt(totalBudget)}</div></div>
    <div class="stat-card"><div class="stat-label">Trip Duration</div><div class="stat-value teal mono">${tripDays} day${tripDays===1?'':'s'}</div></div>
    <div class="stat-card" style="${spentBg}border-radius:16px"><div class="stat-label" style="${spentTxt}">Total Spent</div><div class="stat-value mono" style="${spentTxt}">${fmt(totalSpent)}</div></div>
    <div class="stat-card"><div class="stat-label">Spent / Day</div><div class="stat-value mono" style="color:var(--ink)">${tripDays>0?fmt(totalSpent/tripDays):'—'}</div></div>
    <div class="stat-card" style="${remBg}border-radius:16px"><div class="stat-label" style="${remTxt}">Remaining</div><div class="stat-value mono" style="${remTxt}">${totalBudget>0?fmt(remaining):'—'}</div></div>
  </div>`;
  if(!expenses.length){
    el.innerHTML+=`<div class="empty-state"><svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="24" width="56" height="40" rx="6"/><path d="M12 36h56"/><circle cx="40" cy="52" r="6"/><path d="M36 52h8"/></svg><h3>No expenses yet</h3><p>Start tracking your travel spending.</p></div>`;
    return;
  }
  budgetCats.forEach(bc=>{
    const catExp=expenses.filter(e=>e.category===bc.id).sort((a,b)=>b.date.localeCompare(a.date));
    if(!catExp.length)return;
    const spent=catExp.reduce((s,e)=>s+e.amount,0);
    const pct=totalBudget>0?Math.min(100,(spent/totalBudget)*100):0;
    const barColor=pct>=100?'var(--danger)':pct>=70?'var(--warning)':'var(--success)';
    const sec=document.createElement('div');sec.className='budget-cat-section';
    sec.innerHTML=`<div class="budget-cat-header">
      <div class="budget-cat-title">${bc.icon} ${bc.id.replace('Food and Drink','Food & Drink')}</div>
      <div class="budget-meta"><span class="mono">${fmt(spent)}</span>${totalBudget>0?`<span style="color:var(--mist);font-size:.75rem">${pct.toFixed(0)}% of budget</span>`:''}</div>
    </div>
    ${totalBudget>0?`<div class="progress-bar" style="margin-bottom:12px"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div>`:''}
    ${catExp.map(e=>`<div class="expense-item">
      <div><div class="expense-name">${esc(e.name)}</div><div class="expense-meta">${formatDate(e.date)}${e.notes?' · '+esc(e.notes):''}</div></div>
      <div style="display:flex;align-items:center;gap:8px"><span class="expense-amount mono">${fmt(e.amount)}</span>
      <button class="icon-btn" style="opacity:1" onclick="confirmDelete('expense','${e.id}',event)" title="Delete">🗑</button></div>
    </div>`).join('')}`;
    document.getElementById('budget-content').appendChild(sec);
  });
}

// ===== EVENTS =====
let editingEventId=null;
const evtCatColors={Sports:'teal',Concert:'rust',Festival:'gold',Theater:'ink',Other:'mist'};
function populateTripSelects(){
  const trips=loadData(KEYS.trips);
  const opts='<option value="">Not linked to a trip</option>'+trips.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
  document.getElementById('f-evt-trip').innerHTML=opts;
  document.getElementById('f-pl-trip').innerHTML='<option value="">Not linked</option>'+trips.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
}
function openEventModal(id=null){
  editingEventId=id;
  evtAttachments=[];
  const e=id?loadData(KEYS.events).find(x=>x.id===id):null;
  document.getElementById('modal-event-title').textContent=id?'Edit Event':'Add Event';
  document.getElementById('f-evt-name').value=e?.name||'';
  document.getElementById('f-evt-venue').value=e?.venue||'';
  document.getElementById('f-evt-date').value=e?.date||'';
  document.getElementById('f-evt-time').value=e?.time||'';
  document.getElementById('f-evt-cat').value=e?.category||'Sports';
  document.getElementById('f-evt-cost').value=e?.ticketCost||'';
  document.getElementById('f-evt-code').value=e?.confirmationCode||'';
  document.getElementById('f-evt-notes').value=e?.notes||'';
  evtAttachments=e?.attachments?JSON.parse(JSON.stringify(e.attachments)):[];
  document.getElementById('f-evt-link-url').value='';
  document.getElementById('f-evt-link-label').value='';
  renderEvtAttachments();
  populateTripSelects();
  if(e?.tripId)document.getElementById('f-evt-trip').value=e.tripId;
  openModal('modal-event');
}
function saveEvent(){
  const name=document.getElementById('f-evt-name').value.trim();
  const date=document.getElementById('f-evt-date').value;
  if(!name){shake('f-evt-name');return}
  if(!date){shake('f-evt-date');return}
  const events=loadData(KEYS.events);
  const eventId=editingEventId||generateId();
  const obj={
    id:eventId,name,
    venue:document.getElementById('f-evt-venue').value.trim(),
    date,time:document.getElementById('f-evt-time').value,
    category:document.getElementById('f-evt-cat').value,
    ticketCost:parseFloat(document.getElementById('f-evt-cost').value)||0,
    confirmationCode:document.getElementById('f-evt-code').value.trim(),
    tripId:document.getElementById('f-evt-trip').value,
    notes:document.getElementById('f-evt-notes').value.trim(),
    attachments:evtAttachments
  };
  if(editingEventId){const i=events.findIndex(e=>e.id===editingEventId);events[i]=obj}
  else events.push(obj);
  editingEventId=null;
  saveData(KEYS.events,events);
  const expenses=loadData(KEYS.expenses);
  const existing=expenses.findIndex(e=>e.eventId===eventId);
  const targetTrip=obj.tripId&&obj.tripId.trim()!==''?obj.tripId:(getActiveTrip()?.id||null);
  if(targetTrip&&obj.ticketCost>0){
    const expObj={
      id:existing>=0?expenses[existing].id:generateId(),
      eventId,
      tripId:targetTrip,
      name:'🎟 '+obj.name+(obj.venue?' @ '+obj.venue:''),
      amount:obj.ticketCost,
      category:'Sports',
      date:obj.date,
      notes:'Auto-synced from Events tab'
    };
    if(existing>=0)expenses[existing]=expObj;else expenses.push(expObj);
  } else if(existing>=0){
    expenses.splice(existing,1);
  }
  saveData(KEYS.expenses,expenses);
  closeModal('modal-event');renderEvents();renderBudget();showToast('Event saved!','success');
}
function deleteEvent(id){
  saveData(KEYS.events,loadData(KEYS.events).filter(e=>e.id!==id));
  saveData(KEYS.expenses,loadData(KEYS.expenses).filter(e=>e.eventId!==id));
  renderEvents();showToast('Event deleted','error');
}
function renderEvents(){
  const events=loadData(KEYS.events).sort((a,b)=>{
    const da=daysUntil(a.date),db=daysUntil(b.date);
    if(da>=0&&db>=0)return da-db;
    if(da<0&&db<0)return db-da;
    return da>=0?-1:1;
  });
  const el=document.getElementById('events-list');
  if(!events.length){
    el.innerHTML=`<div class="empty-state"><svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="20" width="52" height="48" rx="6"/><path d="M26 12v16M54 12v16M14 40h52"/><path d="M28 54l6 6 18-18"/></svg><h3>No events yet</h3><p>Add an event, game, or show.</p></div>`;
    return;
  }
  el.innerHTML=`<div class="events-grid">${events.map(e=>{
    const du=daysUntil(e.date);
    const isToday=du===0;const isPast=du<0;
    let badge='';
    if(isToday)badge=`<div class="countdown-badge" style="background:var(--gold);color:var(--white)">TODAY 🎉</div>`;
    else if(isPast)badge=`<div class="countdown-badge" style="background:var(--sand);color:var(--mist)">Completed</div>`;
    else badge=`<div class="countdown-badge" style="background:var(--rust);color:var(--white)">In ${du} day${du===1?'':'s'}</div>`;
    const cc=evtCatColors[e.category]||'mist';
    return`<div class="event-card ${isPast?'event-past':''}">
      <div class="card-actions" style="opacity:1;top:52px">
        <button class="icon-btn" onclick="openEventModal('${e.id}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="confirmDelete('event','${e.id}',event)" title="Delete">🗑</button>
      </div>
      ${badge}
      <div class="tag-pill event-cat-pill" style="background:var(--${cc==='mist'?'sand':''+cc}-light,var(--sand));color:var(--${cc})">${e.category}</div>
      <div class="event-name">${esc(e.name)}</div>
      ${e.venue?`<div class="event-venue">📍 ${esc(e.venue)}</div>`:''}
      <div class="event-datetime">${formatDate(e.date)}${e.time?' · '+fmtTime(e.time):''}</div>
      ${e.ticketCost?`<div class="event-ticket">🎟 ${fmt(e.ticketCost)}</div>`:''}
      ${e.confirmationCode?`<div class="event-code">Code: ${esc(e.confirmationCode)}</div>`:''}
      ${e.notes?`<div class="stop-notes" style="margin-top:6px">${esc(e.notes)}</div>`:''}
    </div>`;
  }).join('')}</div>`;
}

// ===== PLACES =====
let editingPlaceId=null;
let activeCatFilter='All',activeStatusFilter='All';
const placeIcons={Restaurant:'🍽',Museum:'🏛',Bar:'🍺',Beach:'🏖',Shop:'🛍',Park:'🌿',Hotel:'🏨',Other:'📍'};
function setCatFilter(el){
  activeCatFilter=el.dataset.catFilter;
  document.querySelectorAll('[data-cat-filter]').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');renderPlaces();
}
function setStatusFilter(el){
  activeStatusFilter=el.dataset.statusFilter;
  document.querySelectorAll('[data-status-filter]').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');renderPlaces();
}
function openPlaceModal(id=null){
  editingPlaceId=id;
  const p=id?loadData(KEYS.places).find(x=>x.id===id):null;
  document.getElementById('modal-place-title').textContent=id?'Edit Place':'Add Place';
  document.getElementById('f-pl-name').value=p?.name||'';
  document.getElementById('f-pl-addr').value=p?.address||'';
  document.getElementById('f-pl-maps').value=p?.googleMapsLink||'';
  document.getElementById('f-pl-cat').value=p?.category||'Restaurant';
  document.getElementById('f-pl-notes').value=p?.notes||'';
  const rating=p?.rating||0;
  document.getElementById('f-pl-rating').value=rating;
  renderModalStars(rating);
  const status=p?.status||'Want to Go';
  document.getElementById('f-pl-status').value=status;
  document.getElementById('st-want').classList.toggle('active',status==='Want to Go');
  document.getElementById('st-been').classList.toggle('active',status==='Been There');
  populateTripSelects();
  if(p?.tripId)document.getElementById('f-pl-trip').value=p.tripId;
  openModal('modal-place');
}
function renderModalStars(v){
  document.querySelectorAll('#f-pl-stars .star').forEach((s,i)=>{
    s.classList.toggle('filled',i<v);
  });
}
function selectStars(e){
  const star=e.target.closest('.star');if(!star)return;
  const v=parseInt(star.dataset.v);
  document.getElementById('f-pl-rating').value=v;
  renderModalStars(v);
}
function setStatus(v){
  document.getElementById('f-pl-status').value=v;
  document.getElementById('st-want').classList.toggle('active',v==='Want to Go');
  document.getElementById('st-been').classList.toggle('active',v==='Been There');
}
function savePlace(){
  const name=document.getElementById('f-pl-name').value.trim();
  if(!name){shake('f-pl-name');return}
  const places=loadData(KEYS.places);
  const obj={
    id:editingPlaceId||generateId(),name,
    address:document.getElementById('f-pl-addr').value.trim(),
    googleMapsLink:document.getElementById('f-pl-maps').value.trim(),
    category:document.getElementById('f-pl-cat').value,
    rating:parseInt(document.getElementById('f-pl-rating').value)||0,
    status:document.getElementById('f-pl-status').value,
    tripId:document.getElementById('f-pl-trip').value,
    notes:document.getElementById('f-pl-notes').value.trim()
  };
  if(editingPlaceId){const i=places.findIndex(p=>p.id===editingPlaceId);places[i]=obj}
  else places.push(obj);
  editingPlaceId=null;
  saveData(KEYS.places,places);closeModal('modal-place');renderPlaces();showToast('Place saved!','success');
}
function deletePlace(id){saveData(KEYS.places,loadData(KEYS.places).filter(p=>p.id!==id));renderPlaces();showToast('Place deleted','error')}
function ratePlace(id,rating){
  const places=loadData(KEYS.places);const i=places.findIndex(p=>p.id===id);
  if(i>=0){places[i].rating=rating;saveData(KEYS.places,places);renderPlaces()}
}
function renderPlaces(){
  const q=(document.getElementById('places-search')?.value||'').toLowerCase();
  let places=loadData(KEYS.places);
  if(activeCatFilter!=='All')places=places.filter(p=>p.category===activeCatFilter);
  if(activeStatusFilter!=='All')places=places.filter(p=>p.status===activeStatusFilter);
  if(q)places=places.filter(p=>p.name.toLowerCase().includes(q)||p.address?.toLowerCase().includes(q));
  const el=document.getElementById('places-list');
  if(!places.length){
    el.innerHTML=`<div class="empty-state"><svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="36" r="16"/><line x1="40" y1="52" x2="40" y2="68"/><path d="M26 68h28"/><path d="M32 36a8 8 0 0 1 16 0"/></svg><h3>No places found</h3><p>Save places you want to visit or have visited.</p></div>`;
    return;
  }
  el.innerHTML=`<div class="places-grid">${places.map(p=>{
    const stars=[1,2,3,4,5].map(i=>`<span class="star ${i<=p.rating?'filled':''}" onclick="ratePlace('${p.id}',${i})" title="${i} star${i>1?'s':''}" style="cursor:pointer">★</span>`).join('');
    return`<div class="place-card">
      <div class="card-actions">
        <button class="icon-btn" onclick="openPlaceModal('${p.id}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="confirmDelete('place','${p.id}',event)" title="Delete">🗑</button>
      </div>
      <div style="font-size:.9rem;margin-bottom:4px">${placeIcons[p.category]||'📍'} <span style="color:var(--mist);font-size:.8rem">${p.category}</span></div>
      <div class="place-name">${esc(p.name)}</div>
      ${p.address?`<div class="place-addr">${esc(p.address)}</div>`:''}
      <div class="stars-wrap">${stars}</div>
      <div><span class="status-badge ${p.status==='Been There'?'status-been':'status-want'}">${p.status==='Been There'?'✓ Been There':'Want to Go'}</span></div>
      ${p.notes?`<div class="place-notes">${esc(p.notes)}</div>`:''}
      ${p.googleMapsLink?`<a href="${encodeURI(p.googleMapsLink)}" target="_blank" rel="noopener" class="btn btn-teal" style="margin-top:10px;padding:6px 14px;font-size:.8rem;text-decoration:none">🗺 Open in Maps</a>`:''}
    </div>`;
  }).join('')}</div>`;
}

// ===== CALENDAR =====
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth();
function calPrev(){calMonth--;if(calMonth<0){calMonth=11;calYear--}renderCalendar()}
function calNext(){calMonth++;if(calMonth>11){calMonth=0;calYear++}renderCalendar()}
function renderCalendar(){
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-title').textContent=`${months[calMonth]} ${calYear}`;
  document.getElementById('cal-month-subtitle').textContent=`👇 Just below the calendar — your complete ${months[calMonth]} ${calYear} money picture: budget, savings, and everything you spent this month.`;
  const grid=document.getElementById('cal-grid');grid.innerHTML='';
  const first=new Date(calYear,calMonth,1);
  const last=new Date(calYear,calMonth+1,0);
  let startDow=first.getDay();startDow=(startDow+6)%7;
  const today=new Date();today.setHours(0,0,0,0);
  const trips=loadData(KEYS.trips);
  const events=loadData(KEYS.events);
  const stops=loadData(KEYS.stops);
  const days=[];
  for(let i=0;i<startDow;i++){
    const d=new Date(calYear,calMonth,1-startDow+i);days.push({date:d,cur:false});
  }
  for(let d=1;d<=last.getDate();d++)days.push({date:new Date(calYear,calMonth,d),cur:true});
  const rem=days.length%7===0?0:7-(days.length%7);
  for(let i=1;i<=rem;i++)days.push({date:new Date(calYear,calMonth+1,i),cur:false});
  days.forEach(({date,cur})=>{
    const ds=date.toISOString().split('T')[0];
    const isToday=date.getTime()===today.getTime();
    const cell=document.createElement('div');cell.className='cal-cell'+(cur?'':' other-month')+(isToday?' today':'');
    cell.onclick=()=>openDayPanel(ds);
    let html=`<div class="day-num">${date.getDate()}</div>`;
    const dayTrips=trips.filter(t=>t.startDate&&t.endDate&&ds>=t.startDate&&ds<=t.endDate);
    dayTrips.forEach(t=>{html+=`<div class="cal-trip-band cg-${t.coverColor}" style="opacity:.5">${esc(t.name)}</div>`});
    const dayEvents=events.filter(e=>e.date===ds);
    if(dayEvents.length){
      html+=`<div class="cal-dots">${dayEvents.slice(0,3).map(()=>`<span class="cal-event-dot"></span>`).join('')}${dayEvents.length>3?`<span style="font-size:.6rem;color:var(--rust)">+${dayEvents.length-3}</span>`:''}</div>`;
    }
    const dayStops=stops.filter(s=>{
      const trip=trips.find(t=>t.id===s.tripId);
      if(!trip||!trip.startDate)return false;
      const stopDate=new Date(new Date(trip.startDate+'T00:00:00').getTime()+(s.day-1)*86400000);
      return stopDate.toISOString().split('T')[0]===ds;
    });
    dayStops.slice(0,2).forEach(s=>{html+=`<div class="cal-event-row teal-txt">${esc(s.placeName)}</div>`});
    cell.innerHTML=html;grid.appendChild(cell);
  });

  const monthStart=`${calYear}-${String(calMonth+1).padStart(2,'0')}-01`;
  const monthEnd=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
  const allExpenses=loadData(KEYS.expenses);
  const monthTrips=trips.filter(t=>t.startDate&&t.endDate&&t.startDate<=monthEnd&&t.endDate>=monthStart);
  const summaryEl=document.getElementById('cal-month-summary');
  if(!monthTrips.length){summaryEl.innerHTML='';return;}
  let totalSpent=0,totalBudget=0;
  const cards=monthTrips.map(t=>{
    const tripExp=allExpenses.filter(e=>e.tripId===t.id&&e.date>=monthStart&&e.date<=monthEnd);
    const spent=tripExp.reduce((s,e)=>s+e.amount,0);
    totalSpent+=spent;totalBudget+=t.totalBudget||0;
    const pct=t.totalBudget?Math.min(100,(spent/t.totalBudget)*100):0;
    const barColor=pct>=100?'var(--danger)':pct>=70?'var(--warning)':'var(--success)';
    const over=t.totalBudget>0&&spent>t.totalBudget;
    return`<div class="stat-card" style="text-align:left;padding:16px 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-weight:600;font-size:.95rem;font-family:'Playfair Display',serif">${esc(t.name)}</div>
        <div style="font-size:.78rem;color:var(--mist)">${esc(t.destination)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:.85rem;margin-bottom:6px">
        <span style="color:${over?'var(--danger)':'var(--teal)'}">Spent: ${fmt(spent)}</span>
        ${t.totalBudget?`<span style="color:var(--mist)">Budget: ${fmt(t.totalBudget)}</span>`:'<span style="color:var(--mist)">No budget set</span>'}
      </div>
      ${t.totalBudget?`<div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div>`:''}
    </div>`;
  }).join('');
  const overallPct=totalBudget?Math.min(100,(totalSpent/totalBudget)*100):0;
  const overallColor=totalBudget>0&&totalSpent>totalBudget?'var(--danger)':'var(--success)';
  const totalSaved=totalBudget>0?totalBudget-totalSpent:0;
  const savedColor=totalSaved>=0?'var(--success)':'var(--danger)';
  summaryEl.innerHTML=`
    <h3 style="font-size:1.4rem;font-weight:700;margin-bottom:16px;font-family:'Playfair Display',serif;text-align:center">
      Total amount spent/budget for the month of ${months[calMonth]} ${calYear}
    </h3>
    <div class="cards-grid" style="margin-bottom:20px">${cards}</div>
    <div class="stat-card" style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;gap:24px">
      <div><div class="stat-label">Total Spent This Month</div><div class="stat-value mono" style="color:${overallColor}">${fmt(totalSpent)}</div></div>
      ${totalBudget?`<div><div class="stat-label">Combined Budget</div><div class="stat-value gold mono">${fmt(totalBudget)}</div></div>`:''}
      ${totalBudget?`<div style="flex:1"><div class="progress-bar" style="height:8px"><div class="progress-fill" style="width:${overallPct}%;background:${overallColor}"></div></div><div style="font-size:.75rem;color:var(--mist);margin-top:4px;font-family:'DM Mono',monospace">${overallPct.toFixed(0)}% of combined budget</div></div>`:''}
      ${totalBudget?`<div><div class="stat-label">Amount Saved</div><div class="stat-value mono" style="color:${savedColor}">${fmt(Math.abs(totalSaved))}${totalSaved<0?' over':' saved'}</div></div>`:''}
    </div>`;
}
function openDayPanel(ds){
  const trips=loadData(KEYS.trips);
  const events=loadData(KEYS.events).filter(e=>e.date===ds);
  const expenses=loadData(KEYS.expenses).filter(e=>e.date===ds);
  const stops=loadData(KEYS.stops).filter(s=>{
    const trip=trips.find(t=>t.id===s.tripId);
    if(!trip||!trip.startDate)return false;
    const sd=new Date(new Date(trip.startDate+'T00:00:00').getTime()+(s.day-1)*86400000);
    return sd.toISOString().split('T')[0]===ds;
  });
  const dayTrip=trips.find(t=>t.startDate&&t.endDate&&ds>=t.startDate&&ds<=t.endDate);
  document.getElementById('panel-date-title').textContent=formatDate(ds);
  let html='';
  if(dayTrip)html+=`<div class="panel-section"><div class="panel-section-title">Trip</div><div class="panel-item"><div class="pi-title">${esc(dayTrip.name)}</div><div class="pi-meta">${esc(dayTrip.destination)}</div></div></div>`;
  if(events.length){
    html+=`<div class="panel-section"><div class="panel-section-title">Events (${events.length})</div>`;
    events.forEach(e=>{html+=`<div class="panel-item"><div class="pi-title">${esc(e.name)}</div><div class="pi-meta">${e.time?fmtTime(e.time)+' · ':''} ${esc(e.venue||'')}</div></div>`});
    html+='</div>';
  }
  if(stops.length){
    html+=`<div class="panel-section"><div class="panel-section-title">Itinerary (${stops.length})</div>`;
    stops.forEach(s=>{html+=`<div class="panel-item"><div class="pi-title">${catIcons[s.category]||'📍'} ${esc(s.placeName)}</div><div class="pi-meta">${s.time?fmtTime(s.time)+' · ':''} ${esc(s.address||'')}</div></div>`});
    html+='</div>';
  }
  if(expenses.length){
    html+=`<div class="panel-section"><div class="panel-section-title">Expenses (${expenses.length})</div>`;
    expenses.forEach(e=>{html+=`<div class="panel-item"><div class="pi-title">${esc(e.name)}</div><div class="pi-meta" style="font-family:'DM Mono',monospace">${fmt(e.amount)}</div></div>`});
    html+='</div>';
  }
  if(!dayTrip&&!events.length&&!stops.length&&!expenses.length)html='<div class="panel-empty">Nothing planned — add something!</div>';
  document.getElementById('panel-body').innerHTML=html;
  document.getElementById('day-panel').classList.add('open');
}
function closePanel(){document.getElementById('day-panel').classList.remove('open')}

// ===== DELETE CONFIRM =====
const deleteHandlers={trip:deleteTrip,stop:deleteStop,expense:deleteExpense,event:deleteEvent,place:deletePlace};
function confirmDelete(type,id,e){
  e.stopPropagation();
  const btn=e.currentTarget;
  const existing=btn.parentElement.querySelector('.del-confirm');
  if(existing){existing.remove();return}
  const div=document.createElement('div');div.className='del-confirm';
  div.innerHTML=`<span>Delete?</span><button class="del-yes" onclick="doDelete('${type}','${id}',this)">Yes</button><button class="del-no" onclick="this.closest('.del-confirm').remove()">No</button>`;
  btn.parentElement.insertAdjacentElement('afterend',div);
}
function doDelete(type,id,el){el.closest('.del-confirm').remove();deleteHandlers[type]&&deleteHandlers[type](id)}

// ===== HELPERS =====
function shake(id){const el=document.getElementById(id);if(!el)return;el.classList.add('error');setTimeout(()=>el.classList.remove('error'),500)}
function esc(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ===== EVENT ATTACHMENTS =====
let evtAttachments=[];
function addEvtLink(){
  const url=document.getElementById('f-evt-link-url').value.trim();
  if(!url){shake('f-evt-link-url');return}
  const label=document.getElementById('f-evt-link-label').value.trim()||url;
  evtAttachments.push({type:'link',label,url,id:generateId()});
  document.getElementById('f-evt-link-url').value='';
  document.getElementById('f-evt-link-label').value='';
  renderEvtAttachments();
}
function handleEvtDrop(e){
  e.preventDefault();document.getElementById('evt-drop-zone').classList.remove('drag-over');
  readFilesIntoAttachments(e.dataTransfer.files,evtAttachments,renderEvtAttachments);
}
function handleEvtFiles(files){readFilesIntoAttachments(files,evtAttachments,renderEvtAttachments)}
function renderEvtAttachments(){
  const el=document.getElementById('evt-attachments-list');
  if(!evtAttachments.length){el.innerHTML='';return}
  el.innerHTML=evtAttachments.map(a=>attachItemHTML(a,'evtAttachments')).join('');
}
function removeEvtAttachment(id){evtAttachments=evtAttachments.filter(a=>a.id!==id);renderEvtAttachments()}

// ===== DOCS =====
function addDoc(type){
  if(type==='link'){
    const trip=getActiveTrip();if(!trip){showToast('Select a trip first','error');return}
    const url=document.getElementById('doc-link-url').value.trim();
    if(!url){shake('doc-link-url');return}
    const label=document.getElementById('doc-link-label').value.trim()||url;
    const docs=loadData(KEYS.docs);
    docs.push({type:'link',label,url,id:generateId(),tripId:trip.id,addedAt:todayStr()});
    saveData(KEYS.docs,docs);
    document.getElementById('doc-link-url').value='';
    document.getElementById('doc-link-label').value='';
    renderDocs();showToast('Link saved!','success');
  }
}
function handleDocDrop(e){
  e.preventDefault();document.getElementById('doc-drop-zone').classList.remove('drag-over');
  const trip=getActiveTrip();if(!trip){showToast('Select a trip first','error');return}
  const docs=loadData(KEYS.docs);
  readFilesIntoAttachments(e.dataTransfer.files,docs,trip.id,(items)=>{saveData(KEYS.docs,items);renderDocs();showToast('File added!','success')});
}
function handleDocFiles(files){
  const trip=getActiveTrip();if(!trip){showToast('Select a trip first','error');return}
  const docs=loadData(KEYS.docs);
  readFilesIntoAttachments(files,docs,trip.id,(items)=>{saveData(KEYS.docs,items);renderDocs();showToast('File added!','success')});
}
function removeDoc(id){saveData(KEYS.docs,loadData(KEYS.docs).filter(d=>d.id!==id));renderDocs();showToast('Removed','error')}
function renderDocs(){
  const trip=getActiveTrip();
  const el=document.getElementById('docs-list');
  const docsAddRow=document.querySelector('.docs-add-row');
  const docDropZone=document.getElementById('doc-drop-zone');
  if(!trip){
    if(docsAddRow)docsAddRow.style.display='none';
    if(docDropZone)docDropZone.style.display='none';
    el.innerHTML=`<div class="require-trip"><h3>No trip selected</h3><p>Select a trip from the Trips tab to manage its documents.</p></div>`;
    return;
  }
  if(docsAddRow)docsAddRow.style.display='';
  if(docDropZone)docDropZone.style.display='';
  const docs=loadData(KEYS.docs).filter(d=>d.tripId===trip.id);
  const secHeader=document.querySelector('#tab-docs .section-header .section-title');
  if(secHeader)secHeader.textContent=`${trip.name} — Documents`;
  if(!docs.length){
    el.innerHTML=`<div class="empty-state" style="padding:60px 24px"><svg width="64" height="64" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="10" width="40" height="56" rx="6"/><rect x="24" y="10" width="48" height="56" rx="6" fill="white" stroke-width="2"/><line x1="32" y1="30" x2="60" y2="30"/><line x1="32" y1="40" x2="60" y2="40"/><line x1="32" y1="50" x2="50" y2="50"/></svg><h3>No documents yet</h3><p>Upload files, PDFs, or save links for this trip.</p></div>`;
    return;
  }
  const links=docs.filter(d=>d.type==='link');
  const files=docs.filter(d=>d.type==='file');
  let html='';
  if(links.length){
    html+=`<div class="docs-section"><div class="docs-section-title">🔗 Links (${links.length})</div>`;
    links.forEach(d=>{html+=attachItemHTML(d,'docs')});
    html+='</div>';
  }
  if(files.length){
    html+=`<div class="docs-section"><div class="docs-section-title">📎 Files (${files.length})</div>`;
    files.forEach(d=>{html+=attachItemHTML(d,'docs')});
    html+='</div>';
  }
  el.innerHTML=html;
}

// ===== SHARED ATTACHMENT HELPERS =====
function readFilesIntoAttachments(files,arr,tripIdOrCallback,callback){
  let tripId=null,cb=callback;
  if(typeof tripIdOrCallback==='function'){cb=tripIdOrCallback}
  else{tripId=tripIdOrCallback}
  let pending=files.length;
  if(!pending){cb(arr);return}
  Array.from(files).forEach(file=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      const entry={type:'file',label:file.name,name:file.name,fileType:file.type,data:ev.target.result,id:generateId(),addedAt:todayStr()};
      if(tripId)entry.tripId=tripId;
      arr.push(entry);
      pending--;if(pending===0)cb(arr);
    };
    reader.readAsDataURL(file);
  });
}
function attachItemHTML(a,scope){
  const isLink=a.type==='link';
  const icon=isLink?'🔗':fileIcon(a.fileType||'');
  const nameHtml=isLink
    ?`<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.label)}</a>`
    :(a.data?`<a href="${a.data}" download="${esc(a.name)}">${esc(a.label)}</a>`:esc(a.label));
  const removeFn=scope==='docs'?`removeDoc('${a.id}')`:`removeEvtAttachment('${a.id}')`;
  return`<div class="attach-item"><span class="attach-item-icon">${icon}</span><span class="attach-item-name">${nameHtml}</span><button class="attach-item-del" onclick="${removeFn}" title="Remove">✕</button></div>`;
}
function fileIcon(type){
  if(type.includes('pdf'))return'📄';
  if(type.includes('image'))return'🖼';
  if(type.includes('word')||type.includes('document'))return'📝';
  if(type.includes('text'))return'📋';
  if(type.includes('mail'))return'📧';
  return'📎';
}

// ===== iOS INSTALL HINT =====
function dismissIosHint(){
  document.getElementById('ios-install-hint').classList.remove('show');
  localStorage.setItem('voyage_ios_hint_dismissed','1');
}
function maybeShowIosHint(){
  if(localStorage.getItem('voyage_ios_hint_dismissed'))return;
  const ua=navigator.userAgent;
  const isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isSafari=/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS/.test(ua);
  const isStandalone=window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
  if(isIOS&&isSafari&&!isStandalone){
    setTimeout(()=>document.getElementById('ios-install-hint').classList.add('show'),1500);
  }
}

// ===== INIT =====
renderSwatches();
updateNavTrip();
updateCurrencyPrefixes();
renderTrips();
renderCalendar();
renderDocs();
maybeShowIosHint();
