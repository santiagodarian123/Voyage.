// Storage, currency, date helpers, export/import
// Loaded before app.js. All functions are global.

const KEYS={trips:'voyage_trips',stops:'voyage_stops',expenses:'voyage_expenses',budgets:'voyage_budgets',events:'voyage_events',places:'voyage_places',active:'voyage_active_trip',docs:'voyage_docs'};
function saveData(k,arr){localStorage.setItem(k,JSON.stringify(arr))}
function loadData(k){try{return JSON.parse(localStorage.getItem(k))||[]}catch{return[]}}
function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function getActiveTrip(){const id=localStorage.getItem(KEYS.active);if(!id)return null;return loadData(KEYS.trips).find(t=>t.id===id)||null}
function setActiveTrip(id){localStorage.setItem(KEYS.active,id);updateNavTrip();renderItinerary();renderBudget();if(activeTab==='docs')renderDocs()}

// ===== CURRENCY =====
const CURRENCIES={
  USD:{symbol:'$',label:'USD — US Dollar',decimals:2},
  EUR:{symbol:'€',label:'EUR — Euro',decimals:2},
  GBP:{symbol:'£',label:'GBP — British Pound',decimals:2},
  JPY:{symbol:'¥',label:'JPY — Japanese Yen',decimals:0},
  AUD:{symbol:'A$',label:'AUD — Australian Dollar',decimals:2},
  CAD:{symbol:'C$',label:'CAD — Canadian Dollar',decimals:2},
  CHF:{symbol:'Fr',label:'CHF — Swiss Franc',decimals:2},
  CNY:{symbol:'¥',label:'CNY — Chinese Yuan',decimals:2},
  INR:{symbol:'₹',label:'INR — Indian Rupee',decimals:2},
  MXN:{symbol:'MX$',label:'MXN — Mexican Peso',decimals:2},
  CZK:{symbol:'Kč',label:'CZK — Czech Koruna',decimals:2}
};
let activeCurrency=localStorage.getItem('voyage_currency')||'USD';
function fmt(n){const c=CURRENCIES[activeCurrency];return c.symbol+(n||0).toFixed(c.decimals)}
function setCurrency(code){activeCurrency=code;localStorage.setItem('voyage_currency',code);updateCurrencyPrefixes();renderTab(activeTab)}
function updateCurrencyPrefixes(){const sym=CURRENCIES[activeCurrency].symbol;document.querySelectorAll('.currency-prefix').forEach(el=>el.textContent=sym)}

// ===== DATE HELPERS =====
function formatDate(s){if(!s)return'';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
function formatDateRange(s,e){if(!s||!e)return'';const sd=new Date(s+'T00:00:00'),ed=new Date(e+'T00:00:00');const sm=sd.toLocaleDateString('en-US',{month:'short',day:'numeric'}),em=ed.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});return sm+' – '+em}
function daysBetween(s,e){if(!s||!e)return 0;return Math.round((new Date(e+'T00:00:00')-new Date(s+'T00:00:00'))/(86400000))+1}
function daysUntil(s){if(!s)return 0;const today=new Date();today.setHours(0,0,0,0);return Math.round((new Date(s+'T00:00:00')-today)/86400000)}
function getDayOfWeek(s){if(!s)return'';return new Date(s+'T00:00:00').toLocaleDateString('en-US',{weekday:'long'})}
function todayStr(){return new Date().toISOString().split('T')[0]}

// ===== EXPORT / IMPORT =====
function exportData(){
  const payload={
    _version:1,
    _exported:new Date().toISOString(),
    trips:loadData(KEYS.trips),
    stops:loadData(KEYS.stops),
    expenses:loadData(KEYS.expenses),
    budgets:loadData(KEYS.budgets),
    events:loadData(KEYS.events),
    places:loadData(KEYS.places),
    docs:loadData(KEYS.docs),
    currency:localStorage.getItem('voyage_currency')||'USD'
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='voyage-backup-'+todayStr()+'.json';
  a.click();URL.revokeObjectURL(a.href);
  showToast('Data exported!','success');
}
function importData(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(!d.trips||!d._version)throw new Error('Invalid file');
      if(!confirm('This will replace ALL your current data. Continue?')){input.value='';return}
      saveData(KEYS.trips,d.trips||[]);
      saveData(KEYS.stops,d.stops||[]);
      saveData(KEYS.expenses,d.expenses||[]);
      saveData(KEYS.budgets,d.budgets||[]);
      saveData(KEYS.events,d.events||[]);
      saveData(KEYS.places,d.places||[]);
      saveData(KEYS.docs,d.docs||[]);
      if(d.currency)localStorage.setItem('voyage_currency',d.currency);
      activeCurrency=d.currency||'USD';
      localStorage.removeItem(KEYS.active);
      input.value='';
      updateNavTrip();updateCurrencyPrefixes();renderTab(activeTab);
      showToast('Data imported successfully!','success');
    }catch(e){
      showToast('Invalid backup file','error');input.value='';
    }
  };
  reader.readAsText(file);
}
