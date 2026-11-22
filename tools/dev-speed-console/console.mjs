// TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH
const byId = id => document.getElementById(id);
const {content:token} = document.querySelector('meta[name="operator-token"]');
const duration = byId('duration');
const adaptive = byId('adaptive');
const full = byId('full');
let mode, inFlight = false;
function buttons() {
  for (const [button,name] of [[adaptive,'Adaptive'],[full,'Full Speed']]) {
    button.setAttribute('aria-pressed', String(mode===name));
    button.disabled = inFlight || !mode || mode===name;
  }
}
async function update(target) {
  if (inFlight) return;
  if (target==='Full Speed' && !duration.reportValidity()) return;
  inFlight = true;
  if (target) byId('message').textContent = '';
  buttons();
  try {
    const options = target ? {
      method:'POST',
      headers:{'content-type':'application/json','x-b2z-operator':token},
      body:JSON.stringify({full_speed:target==='Full Speed',seconds:duration.valueAsNumber}),
    } : {headers:{'x-b2z-operator':token}};
    const response = await fetch('/status',options);
    const status = await response.json();
    if (!response.ok) throw Error(status.error);
    const wasUnavailable = !mode;
    mode = status.mode;
    byId('mode').textContent = `${mode} · ${status.running ? status.idle ? 'Simulation idle' : 'Simulation running' : 'Simulation stopped'} · Adaptive tier ${status.adaptive_tier}`;
    byId('remaining').textContent = mode==='Full Speed' ? `${status.remaining_seconds} seconds remaining` : '';
    if (target || wasUnavailable) byId('message').textContent = '';
  } catch (error) {
    byId('message').textContent = error.message;
    if (!target) {
      mode = undefined;
      byId('mode').textContent = 'Backend status unavailable';
      byId('remaining').textContent = '';
    }
  } finally {
    inFlight = false;
    buttons();
  }
}
adaptive.addEventListener('click',()=>void update('Adaptive'));
full.addEventListener('click',()=>void update('Full Speed'));
void update();
setInterval(()=>void update(),1000);
