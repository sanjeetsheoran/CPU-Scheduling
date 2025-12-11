// script.js
(function(){
  // Data structures
  let processes = []; // { pid, arrival, burst, priority }
  let pidCounter = 1;

  // DOM
  const arrivalEl = document.getElementById('arrival');
  const burstEl = document.getElementById('burst');
  const priorityEl = document.getElementById('priority');
  const addBtn = document.getElementById('addProc');
  const clearBtn = document.getElementById('clearProcs');
  const procTableBody = document.querySelector('#procTable tbody');
  const algorithmEl = document.getElementById('algorithm');
  const quantumWrap = document.getElementById('quantumWrap');
  const quantumEl = document.getElementById('quantum');
  const runBtn = document.getElementById('run');
  const resetBtn = document.getElementById('reset');
  const downloadBtn = document.getElementById('download');

  const resultsSection = document.getElementById('results');
  const ganttEl = document.getElementById('gantt');
  const ganttTicksEl = document.getElementById('gantt-ticks');
  const outTableBody = document.querySelector('#outTable tbody');
  const avgWT = document.getElementById('avgWT');
  const avgTAT = document.getElementById('avgTAT');

  // Helpers
  function renderProcTable(){
    procTableBody.innerHTML = '';
    processes.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.pid}</td>
        <td>${p.arrival}</td>
        <td>${p.burst}</td>
        <td>${p.priority}</td>
        <td>
          <button data-pid="${p.pid}" class="edit">Edit</button>
          <button data-pid="${p.pid}" class="del">Delete</button>
        </td>
      `;
      procTableBody.appendChild(tr);
    });
  }

  function addProcess(){
    const at = parseInt(arrivalEl.value,10);
    const bt = parseInt(burstEl.value,10);
    const pr = parseInt(priorityEl.value,10);

    if(Number.isNaN(at) || Number.isNaN(bt) || Number.isNaN(pr) || bt <= 0){
      alert('Enter valid numeric Arrival, Burst (>0) and Priority');
      return;
    }

    const proc = { pid:'P'+pidCounter++, arrival: at, burst: bt, priority: pr };
    processes.push(proc);
    processes.sort((a,b)=> a.arrival - b.arrival || a.pid.localeCompare(b.pid));
    renderProcTable();
  }

  function clearAll(){
    if(!confirm('Clear all processes?')) return;
    processes = [];
    pidCounter = 1;
    renderProcTable();
    hideResults();
  }

  function editOrDelete(e){
    if(!e.target) return;
    const btn = e.target;
    const pid = btn.getAttribute('data-pid');
    if(btn.classList.contains('del')){
      processes = processes.filter(p=>p.pid !== pid);
      renderProcTable();
      hideResults();
    } else if(btn.classList.contains('edit')){
      const p = processes.find(x=>x.pid === pid);
      if(!p) return;
      const newAT = prompt('Arrival Time', p.arrival);
      const newBT = prompt('Burst Time', p.burst);
      const newPR = prompt('Priority', p.priority);
      if(newAT === null || newBT === null || newPR === null) return;
      p.arrival = parseInt(newAT,10);
      p.burst = parseInt(newBT,10);
      p.priority = parseInt(newPR,10);
      processes.sort((a,b)=> a.arrival - b.arrival || a.pid.localeCompare(b.pid));
      renderProcTable();
      hideResults();
    }
  }

  function hideResults(){
    resultsSection.hidden = true;
    ganttEl.innerHTML = '';
    ganttTicksEl.innerHTML = '';
    outTableBody.innerHTML = '';
    avgWT.textContent = '-';
    avgTAT.textContent = '-';
  }

  // Scheduling implementations (non-destructive copies)
  function makeCopy(){
    return processes.map(p=>({
      pid: p.pid,
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      remaining: p.burst,
      start: -1,
      completion: 0,
      waiting: 0,
      turnaround: 0
    }));
  }

  function fcfsSim(procs){
    procs.sort((a,b)=> a.arrival - b.arrival || a.pid.localeCompare(b.pid));
    const gantt = [];
    let time = 0;
    procs.forEach(p=>{
      if(time < p.arrival) time = p.arrival;
      p.start = time;
      time += p.burst;
      p.completion = time;
      p.turnaround = p.completion - p.arrival;
      p.waiting = p.turnaround - p.burst;
      gantt.push({pid:p.pid, start:p.start, end:p.completion});
    });
    return {procs, gantt};
  }

  function sjfSim(procs){
    procs.sort((a,b)=> a.arrival - b.arrival || a.pid.localeCompare(b.pid));
    const n = procs.length;
    const gantt = [];
    let completed = 0, time = 0;
    while(completed < n){
      const ready = procs.filter(x=> x.arrival <= time && x.completion === 0);
      if(ready.length === 0){ time++; continue; }
      // choose min burst
      ready.sort((a,b)=> a.burst - b.burst || a.arrival - b.arrival);
      const cur = ready[0];
      cur.start = time;
      time += cur.burst;
      cur.completion = time;
      cur.turnaround = cur.completion - cur.arrival;
      cur.waiting = cur.turnaround - cur.burst;
      gantt.push({pid:cur.pid, start:cur.start, end:cur.completion});
      completed++;
    }
    return {procs, gantt};
  }

  function prioritySim(procs){
    procs.sort((a,b)=> a.arrival - b.arrival || a.pid.localeCompare(b.pid));
    const n = procs.length;
    const gantt = [];
    let completed = 0, time = 0;
    while(completed < n){
      const ready = procs.filter(x=> x.arrival <= time && x.completion === 0);
      if(ready.length === 0){ time++; continue; }
      ready.sort((a,b)=> a.priority - b.priority || a.arrival - b.arrival);
      const cur = ready[0];
      cur.start = time;
      time += cur.burst;
      cur.completion = time;
      cur.turnaround = cur.completion - cur.arrival;
      cur.waiting = cur.turnaround - cur.burst;
      gantt.push({pid:cur.pid, start:cur.start, end:cur.completion});
      completed++;
    }
    return {procs, gantt};
  }

  function rrSim(procs, quantum){
    procs.sort((a,b)=> a.arrival - b.arrival || a.pid.localeCompare(b.pid));
    const n = procs.length;
    const gantt = [];
    let time = 0;
    const q = [];
    let i = 0;
    // push processes when arrival <= time
    while(i < n || q.length > 0){
      while(i < n && procs[i].arrival <= time){
        q.push(procs[i]);
        i++;
      }
      if(q.length === 0){
        if(i < n){
          time = procs[i].arrival;
          continue;
        } else break;
      }
      const cur = q.shift();
      if(cur.start === -1) cur.start = time;
      const exec = Math.min(quantum, cur.remaining);
      const s = time;
      time += exec;
      cur.remaining -= exec;
      gantt.push({pid:cur.pid, start:s, end:time});
      // Push newly arrived
      while(i < n && procs[i].arrival <= time){
        q.push(procs[i]); i++;
      }
      if(cur.remaining > 0) q.push(cur);
      else {
        cur.completion = time;
        cur.turnaround = cur.completion - cur.arrival;
        cur.waiting = cur.turnaround - cur.burst;
      }
    }
    return {procs, gantt};
  }

  // Render Gantt: dynamic scaling to container width
  function renderGantt(gantt){
    ganttEl.innerHTML = '';
    ganttTicksEl.innerHTML = '';
    if(gantt.length === 0) return;

    const startTime = Math.min(...gantt.map(s=>s.start));
    const endTime = Math.max(...gantt.map(s=>s.end));
    const total = Math.max(1, endTime - startTime);
    // scale: container width - leave some padding
    const containerWidth = Math.max(300, window.innerWidth * 0.6);
    const pxPerUnit = Math.min(80, Math.max(20, (containerWidth - 40) / total));

    // color palette
    const colors = ['#7dd3fc','#fca5a5','#fef08a','#bbf7d0','#c7b2ff','#fbcfe8','#fdba74','#cbd5e1'];

    // create bars
    gantt.forEach((seg, idx)=>{
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.width = ( (seg.end - seg.start) * pxPerUnit ) + 'px';
      bar.style.marginLeft = ((seg.start - startTime) * pxPerUnit) + 'px';
      bar.style.background = colors[idx % colors.length];
      bar.textContent = seg.pid;
      bar.title = `${seg.pid} (${seg.start} → ${seg.end})`;
      ganttEl.appendChild(bar);
    });

    // ticks
    for(let t = startTime; t <= endTime; t++){
      const tick = document.createElement('div');
      tick.style.minWidth = Math.max(20, pxPerUnit) + 'px';
      tick.style.width = (pxPerUnit) + 'px';
      tick.style.textAlign = 'center';
      tick.textContent = t;
      ganttTicksEl.appendChild(tick);
    }
  }

  function renderResults(simOut){
    const procs = simOut.procs;
    const gantt = simOut.gantt;

    // show table
    outTableBody.innerHTML = '';
    let sumWT = 0, sumTAT = 0;
    procs.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.pid}</td>
        <td>${p.arrival}</td>
        <td>${p.burst}</td>
        <td>${p.priority}</td>
        <td>${p.completion}</td>
        <td>${p.waiting}</td>
        <td>${p.turnaround}</td>`;
      outTableBody.appendChild(tr);
      sumWT += p.waiting;
      sumTAT += p.turnaround;
    });
    avgWT.textContent = (procs.length ? (sumWT / procs.length).toFixed(2) : '-');
    avgTAT.textContent = (procs.length ? (sumTAT / procs.length).toFixed(2) : '-');

    renderGantt(gantt);
    resultsSection.hidden = false;
  }

  // wire events
  addBtn.addEventListener('click', addProcess);
  clearBtn.addEventListener('click', clearAll);
  procTableBody.addEventListener('click', editOrDelete);

  algorithmEl.addEventListener('change', ()=>{
    if(algorithmEl.value === 'rr') quantumWrap.style.display = 'inline-block';
    else quantumWrap.style.display = 'none';
  });
  // hide quantum initially if not RR
  if(algorithmEl.value !== 'rr') quantumWrap.style.display = 'none';

  runBtn.addEventListener('click', ()=>{
    if(processes.length === 0){ alert('Add at least one process'); return; }
    const alg = algorithmEl.value;
    const copy = makeCopy();
    let simOut = null;
    if(alg === 'fcfs') simOut = fcfsSim(copy);
    else if(alg === 'sjf') simOut = sjfSim(copy);
    else if(alg === 'priority') simOut = prioritySim(copy);
    else if(alg === 'rr'){
      const q = parseInt(quantumEl.value,10);
      if(Number.isNaN(q) || q <= 0){ alert('Enter valid quantum'); return; }
      simOut = rrSim(copy, q);
    }
    renderResults(simOut);
  });

  resetBtn.addEventListener('click', ()=>{
    if(!confirm('Reset everything?')) return;
    processes = [];
    pidCounter = 1;
    arrivalEl.value = 0; burstEl.value = 1; priorityEl.value = 0;
    quantumEl.value = 2;
    renderProcTable();
    hideResults();
  });


  // initial
  renderProcTable();
})();
