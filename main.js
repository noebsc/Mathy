// ========== Initialisation Firebase/Auth/Navigation ==========

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAz4RmoInpNHsjCMHM6tMdv1SWgUEB7ZyI",
  authDomain: "mathy-f7fc0.firebaseapp.com",
  databaseURL: "https://mathy-f7fc0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mathy-f7fc0",
  storageBucket: "mathy-f7fc0.appspot.com",
  messagingSenderId: "612107190361",
  appId: "1:612107190361:web:4b8c56d142372fc100f148",
  measurementId: "G-RQYNBK3BDE"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

const burger = document.getElementById("burger");
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");

burger.onclick = () => { burger.classList.toggle('open'); sidebar.classList.toggle('open'); };
document.body.addEventListener("mousedown", e=>{
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !burger.contains(e.target)) {
    burger.classList.remove('open'); sidebar.classList.remove('open');
  }
});
sidebar.querySelectorAll("button[data-page]").forEach(btn => {
  btn.onclick = () => switchPage(btn.dataset.page, btn);
});
let currentPage = "tables";
function switchPage(page, btn){
  sidebar.querySelectorAll("button[data-page]").forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  currentPage = page;
  content.classList.remove("fade");
  setTimeout(()=>{ renderPage(page); content.classList.add("fade"); }, 25);
  if(window.innerWidth<740){ burger.classList.remove('open'); sidebar.classList.remove('open'); }
}

// AUTH
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const pwInput = document.getElementById("password");
const authError = document.getElementById("authError");
const registerLink = document.getElementById("registerLink");
let isRegisterMode = false;
registerLink.onclick = ()=>{
  isRegisterMode = !isRegisterMode;
  authForm.querySelector("button[type='submit']").innerText = isRegisterMode ? "Créer un compte" : "Se connecter";
  registerLink.innerText = isRegisterMode ? "Déjà inscrit ? Se connecter" : "Créer un compte";
};
authForm.onsubmit = async (e)=>{
  e.preventDefault();
  authError.innerText = "";
  try{
    if(isRegisterMode){
      await createUserWithEmailAndPassword(auth, emailInput.value, pwInput.value);
      await set(ref(db,'settings/'+auth.currentUser.uid), { userName:emailInput.value.split("@")[0], birthdate:"" });
    } else {
      await signInWithEmailAndPassword(auth, emailInput.value, pwInput.value);
    }
  } catch(err){ authError.innerText = err.message; }
};
onAuthStateChanged(auth, user=>{
  if (user) { authModal.style.display = "none"; renderPage(currentPage);}
  else {authModal.style.display = "flex"; content.innerHTML = ""; document.getElementById("side-table-list").innerHTML = "";}
  showTablesStatsMenu();
});
document.getElementById("logoutBtn").onclick = ()=>{ signOut(auth); };

// Sidebar : menu progression par tables
window.showTablesStatsMenu = async function(){
  if(!auth.currentUser) {document.getElementById("side-table-list").innerHTML=""; return;}
  const uid = auth.currentUser.uid, refQ=ref(db,'quizz/'+uid+'/');
  get(refQ).then(snapshot=>{
    let quizz = snapshot.exists()?snapshot.val():[];
    let masteryByTable = getTableMasteryPercent(quizz); // 1–12
    let lst = "";
    for(let i=1;i<=12;i++){
      lst+=`<button class="side-table" onclick="window.switchPageTable(${i})">
      <span>Table de ${i}</span>
      <span class="sideprogress">${masteryByTable[i]+"%"}</span>
      </button>`;
    }
    document.getElementById("side-table-list").innerHTML = lst;
  });
};
window.switchPageTable=(i)=>{
  switchPage("tables");
  setTimeout(()=>window.showTableZoom(i),150);
};

function renderPage(page){
  if (page==="tables") renderTables();
  else if (page==="apprentissage") renderApprentissage();
  else if (page==="suivi") renderSuivi();
  else if (page==="parametres") renderParametres();
}

//% de connaissance par table de 1 à 12: retourne {1: NN, 2: NN, ...}
window.getTableMasteryPercent = function(quizz){
  let table = {};
  for (let i=1; i<=12; i++) table[i]=0;
  if(!quizz || !Array.isArray(quizz)) return table;
  let table_total = {}, table_ok = {};
  for(let i=1;i<=12;i++){ table_ok[i]=0; table_total[i]=0;}
  quizz.forEach(qz=>{
    (qz.results||[]).forEach(({q,ok})=>{
      let t=q[0];
      table_total[t]++;
      if(ok)table_ok[t]++;
    });
  });
  for(let i=1;i<=12;i++){
    table[i]=table_total[i]?Math.round((table_ok[i]/table_total[i])*100):0;
  }
  return table;
};
// ----------- TABLES MULTIPLICATION -----------
function renderTables(){
  let html = `<h1 style="font-size:1.4rem;color:var(--accent);margin:0 0 10px 0;font-weight:800;">Tables de multiplication</h1>
    <div class="tables-grid">`;
  for(let t=1;t<=12;t++){
    html+=`<div class="table-multi" onclick="window.showTableZoom(${t})" id="t${t}">
      <div style="font-weight:700;color:var(--accent);font-size:1.12rem;">Table de ${t}</div>
      <div>`;
    for(let i=1;i<=12;i++){ html += `<div>${t} × ${i} = <b>${t*i}</b></div>`;}
    html+=`</div></div>`;
  }
  html+=`</div>`;
  content.innerHTML = html;
}
window.showTableZoom = function(n){
  const overlay=document.createElement('div');
  overlay.className='zoom-table-bg';
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();}
  let html = `<div class="zoom-table"><h2 style="color:var(--accent);font-size:1.35rem;font-weight:700;margin:0 0 10px 0;">Table de ${n}</h2>`;
  for(let i=1;i<=12;i++) html+=`<div>${n} × ${i} = <b>${n*i}</b></div>`;
  html+=`</div>`;
  overlay.innerHTML=html;document.body.appendChild(overlay);
}

// ----------- APPRENTISSAGE / MODES -----------
function renderApprentissage(){
  content.innerHTML=`
    <h1 style="font-size:1.27rem;color:var(--accent);font-weight:800;">Apprentissage</h1>
    <div class="modes-flex">
      <button class="mode-btn" onclick="window.selectQuizTables()">Quiz</button>
      <button class="mode-btn" onclick="window.renderBlanksQuiz()">Tables à trou</button>
      <button class="mode-btn" onclick="window.renderCardMode()">Mode cartes</button>
      <button class="mode-btn" onclick="window.renderDefiComplet()">Défi complet</button>
    </div>
    <div id="apprZone"></div>
  `;
}
window.selectQuizTables = function(){
  let tables = '';
  for(let i=1;i<=12;i++)
    tables += `<label class="select-table" id="qsel${i}" onclick="event.preventDefault();window.toggleQuizTable(${i})">
      <input type="checkbox" id="ch${i}" value="${i}" checked style="pointer-events:none;"> ${i}
    </label>`;
  document.getElementById('apprZone').innerHTML = `
    <div><b>Choisis les tables à travailler :</b></div>
    <div class="quiz-select">${tables}</div>
    <button onclick="window.startQuiz()" class="main-btn">Démarrer le quiz</button>
    <button onclick="renderApprentissage()" class="btn">Retour</button>
  `;
  window.selectedQuizTables = Array(12).fill(true);
}
window.toggleQuizTable = function(n){
  window.selectedQuizTables[n-1] = !window.selectedQuizTables[n-1];
  document.getElementById('ch'+n).checked = window.selectedQuizTables[n-1];
  let elem=document.getElementById('qsel'+n);
  if(window.selectedQuizTables[n-1]) elem.classList.add('selected');
  else elem.classList.remove('selected');
}
window.startQuiz = function(){
  let arr=[];for(let i=1;i<=12;i++)if(window.selectedQuizTables[i-1])for(let j=1;j<=12;j++)arr.push([i,j]);
  if(arr.length===0){alert("Sélectionne au moins une table.");return;}
  arr.sort(()=>Math.random()-.5);
  window.quizData = arr; window.quizIndex=0; window.quizResults=[]; nextQuiz();
}
function nextQuiz(){
  if(window.quizIndex>=window.quizData.length) return finishQuiz();
  let [a,b]=window.quizData[window.quizIndex];
  let apprZone = document.getElementById('apprZone');
  apprZone.innerHTML=`<div style="text-align:center;">
    <div class="progress-bar"><div class="bar-inner" id="qtimer"></div></div>
    <div style="margin:15px 0 7px 0; font-size:1.66rem;font-weight:bold;">${a} × ${b}</div>
    <input class="quiz-input" id="quizAnswer" autocomplete="off" type="number" />
    <div>
      <button class="main-btn" onclick="window.submitQuizAnswer()">Valider</button>
      <button class="btn" onclick="renderApprentissage()">Retour</button>
    </div>
  </div>`;
  animateBar(10,30,()=>window.submitQuizAnswer(true)); // barre fluide
  setTimeout(()=>{document.getElementById('quizAnswer').focus();},100);
}
function animateBar(sec,interval,callback){
  const bar=document.getElementById('qtimer');
  let elapsed=0, total=sec*1000, step = interval;
  function update(){
    elapsed+=step;
    let w = Math.max(100*(1-elapsed/total),0);
    bar.style.width = w + '%';
    if(elapsed<total) window.qBarTimer = setTimeout(update,step);
    else callback();
  }
  update();
}
window.submitQuizAnswer = function(timeout){
  clearTimeout(window.qBarTimer);
  const val = +document.getElementById("quizAnswer").value;
  let [a,b] = window.quizData[window.quizIndex];
  window.quizResults.push({q: [a,b], a: val, ok: val===a*b, timeout});
  window.quizIndex++; nextQuiz();
}
function finishQuiz(){
  let results = window.quizResults;
  let ok=results.filter(x=>x.ok&&!x.timeout).length,total=results.length;
  let timeouts=results.filter(x=>x.timeout).length;
  saveQuizToDB(results);
  document.getElementById('apprZone').innerHTML = `
    <div style="text-align:center;margin-top:29px;">
      <div style="font-size:1.32rem;margin-bottom:16px;color:var(--accent);font-weight:700;">
        Résultat : <b>${ok} / ${total}</b>
      </div>
      <div style="font-size:1.06rem;">Questions hors temps : <b>${timeouts}</b></div>
      <button class="main-btn" onclick="renderApprentissage()">Retour</button>
    </div>
  `;
}
function saveQuizToDB(results){
  const uid = auth.currentUser.uid;
  const quiz = { results, date: Date.now() };
  const refQ = ref(db, 'quizz/'+uid+'/');
  get(refQ).then(snapshot=>{
    let arr = snapshot.exists() ? snapshot.val() : [];
    arr=Array.isArray(arr)?arr:[]; arr.push(quiz); set(refQ, arr);
    showTablesStatsMenu();
  });
}

// --------- MODE TROUS -----------
window.renderBlanksQuiz = function(){
  let qs=[], answers=[];
  for(let t=1;t<=12;t++)for(let i=1;i<=12;i++)qs.push({t,i, blank:Math.random()<.37 });
  qs = qs.sort(()=>Math.random()-.5);
  document.getElementById('apprZone').innerHTML = `
    <form id="blankQuizForm">
    <div><b>Complète les cases manquantes :</b></div>
    <div class="blanks-grid" id="blanksGrid">
    ${qs.map((q,j)=>q.blank?
      `<span class="blank-box">${q.t} × ${q.i} = <input type="number" class="blank-answer" id="bq${j}" data-resp="${q.t*q.i}" autocomplete="off"></span>`
      : `<span class="blank-box">${q.t} × ${q.i} = <b>${q.t*q.i}</b></span>`
    ).join("")}
    </div>
    <button class="main-btn" type="submit" style="margin:18px auto 0 auto;display:block;">Vérifier</button>
    <button class="btn" type="button" onclick="renderApprentissage()" style="margin-block:12px 0;">Retour</button>
    </form>
  `;
  document.getElementById("blankQuizForm").onsubmit=(e)=>{
    e.preventDefault();
    let good=0, bad=0, total=0;
    let inputs = Array.from(document.querySelectorAll(".blank-answer"));
    for(let inp of inputs){
      total++;
      if(inp.value!=="" && +inp.value==+inp.dataset.resp){inp.classList.add("blank-correct");good++;}
      else if(inp.value!==""){inp.classList.add("blank-wrong");bad++;}
      inp.disabled=true;
    }
    let corr = document.createElement("div");
    corr.className="correction-row";
    corr.innerHTML = `Résultat : ${good} bonne${good>1?"s":""} sur ${inputs.length}. Les cases vides ne sont pas comptées comme erreur.`;
    document.getElementById("blanksGrid").appendChild(corr);
    let againBtn = document.createElement("button");
    againBtn.textContent = "Recommencer";
    againBtn.type = "button";
    againBtn.className = "main-btn";
    againBtn.onclick = ()=>window.renderBlanksQuiz();
    document.getElementById("blanksGrid").appendChild(againBtn);
  }
}

// --------- MODE DEFI COMPLET (tout à trous) -----------
window.renderDefiComplet = function(){
  let qs=[];
  for(let t=1;t<=12;t++)for(let i=1;i<=12;i++)qs.push({t,i});
  document.getElementById('apprZone').innerHTML = `
    <form id="defiCompletForm">
    <div><b>Défi complet : remplis toutes les multiplications de 1 à 12 !</b></div>
    <div class="blanks-grid" id="defCompletGrid">
    ${qs.map((q,j)=>
      `<span class="blank-box">${q.t} × ${q.i} = <input type="number" class="blank-answer" id="dcomp${j}" data-resp="${q.t*q.i}" autocomplete="off"></span>`
    ).join("")}
    </div>
    <button class="main-btn" type="submit" style="margin:18px auto 0 auto;display:block;">Vérifier</button>
    <button class="btn" type="button" onclick="renderApprentissage()" style="margin-block:12px 0;">Retour</button>
    </form>
  `;
  document.getElementById("defiCompletForm").onsubmit=(e)=>{
    e.preventDefault();
    let good=0, bad=0, total=0;
    let inputs = Array.from(document.querySelectorAll(".blank-answer"));
    for(let inp of inputs){
      total++;
      if(inp.value!=="" && +inp.value==+inp.dataset.resp){inp.classList.add("blank-correct");good++;}
      else {inp.classList.add("blank-wrong");bad++;}
      inp.disabled=true;
    }
    let corr = document.createElement("div");
    corr.className="correction-row";
    corr.innerHTML = `Résultat : ${good} bonnes sur 144.`;
    document.getElementById("defCompletGrid").appendChild(corr);
    let againBtn = document.createElement("button");
    againBtn.textContent = "Recommencer";
    againBtn.type = "button";
    againBtn.className = "main-btn";
    againBtn.onclick = ()=>window.renderDefiComplet();
    document.getElementById("defCompletGrid").appendChild(againBtn);
  }
}

// --------- MODE CARTES ---------
window.renderCardMode = function(){
  let arr = [];
  for(let i=1;i<=12;i++) for(let j=1;j<=12;j++) arr.push([i,j]);
  arr.sort(()=>Math.random()-.5);
  window.cardStack = arr;
  window.cardIndex = 0;
  window.cardFlipped = false;
  showCard();
}
window.showCard = function(){
  let [a,b] = window.cardStack[window.cardIndex];
  const apprZone = document.getElementById('apprZone');
  apprZone.innerHTML=`
    <div class="card-zone">
      <div class="card3D${window.cardFlipped ? ' flipped':''}" onclick="window.flipCard()">
        <div class="card-flip-side card-flip-front" style="z-index:${window.cardFlipped?1:2};display:${window.cardFlipped?'none':'flex'}">${a} × ${b}</div>
        <div class="card-flip-side card-flip-back" style="z-index:${window.cardFlipped?2:1};display:${window.cardFlipped?'flex':'none'}">${a*b}</div>
      </div>
      <div class="card-arrows">
        <button onclick="window.prevCard(event)" ${window.cardIndex===0?'disabled':''}>&lt;</button>
        <button onclick="window.nextCard(event)" ${window.cardIndex===window.cardStack.length-1?'disabled':''}>&gt;</button>
      </div>
      <div style="margin-top:8px;font-size:.99rem;">${window.cardIndex+1} / 144</div>
      <button class="btn" style="margin-top:16px;" onclick="renderApprentissage()">Retour</button>
    </div>
  `;
}
window.flipCard = function () {window.cardFlipped = !window.cardFlipped;window.showCard();}
window.nextCard = function(e){e.stopPropagation();if(window.cardIndex<window.cardStack.length-1){window.cardIndex++;window.cardFlipped=false;window.showCard();}}
window.prevCard = function(e){e.stopPropagation();if(window.cardIndex>0){window.cardIndex--;window.cardFlipped=false;window.showCard();}}
// ---------- SUIVI + STATISTIQUES AVANCÉES ----------
function renderSuivi(){
  const uid = auth.currentUser.uid, refQ=ref(db,'quizz/'+uid+'/');
  get(refQ).then(snapshot=>{
    let quizz = snapshot.exists()?snapshot.val():[]; quizz = Array.isArray(quizz)?quizz:[];
    // Table "maîtrisée": toutes multiplications faites sans erreurs sur cette table 5 sessions de suite
    let stats = computeAdvancedStats(quizz);

    // Historique
    let html = `<h1 style="font-size:1.15rem;color:var(--accent);margin:0 0 16px 0;font-weight:800;">Suivi</h1>
    <div style="overflow-x:auto;"><table class="suivi-table">
    <tr><th>Date</th><th>Score</th><th>Hors temps</th><th>Sans faute</th></tr>
    `+quizz.map(q=>{
      let ok=q.results.filter(x=>x.ok&&!x.timeout).length, total=q.results.length;
      let tmo=q.results.filter(x=>x.timeout).length;
      let full = ok===total && tmo===0;
      let d=new Date(q.date);
      return `<tr>
        <td>${d.toLocaleDateString('fr-FR')}<br>${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</td>
        <td><b>${ok} / ${total}</b></td>
        <td>${tmo}</td>
        <td>${full?"✅":""}</td>
      </tr>`;
    }).reverse().join("")+`</table></div>`;

    // Statistiques/Progression complexe
    html+=`
      <ul class="tables-percentage-list">
        ${[...Array(12)].map((_,i)=>`
        <li>
          <span class="tpname">Table de ${i+1}</span>
          <span class="tpbar"><span class="tpfill" style="width:${stats.perTablePerc[i+1]}%"></span></span>
          <span class="tptext">${stats.perTablePerc[i+1]}%</span>
        </li>`).join('')}
      </ul>
    `;

    html+=`<div class="main-stats">`;

    html+=`
      <div class="stat-block">
        <div class="stat-title">Tables "par cœur"</div>
        <div class="num">${stats.masteredTables.length} / 12</div>
        <div style="font-size:.94rem;">${stats.masteredTables.length>0?("✅ "+stats.masteredTables.join(', ')):"—"}</div>
      </div>
      <div class="stat-block">
        <div class="stat-title">Plus faibles</div>
        <div>${stats.worstTables.length?("🚩 "+stats.worstTables.join(', ')):"Aucune"}</div>
        <div style="font-size:.92rem;">Moins de 40% réussites</div>
      </div>
      <div class="stat-block">
        <div class="stat-title">Progression</div>
        <div class="num">${stats.globalPercent}%</div>
        <div style="font-size:.93rem;">Valeur pondérée (temps, récence, répétition...)</div>
      </div>
      <div class="stat-block">
        <div class="stat-title">Niveau</div>
        <div class="num">${stats.level}</div>
        <div style="font-size:.93rem;">${stats.levelDesc}</div>
        <div style="font-size:.96rem;margin-top:5px;">Âge&nbsp;: ${stats.age||'?'}, moyenne France&nbsp;: ${stats.levelAvg}</div>
        <div style="font-size:.94rem;">${stats.levelDiff==0?'Tu es exactement au niveau moyen de France pour ton âge.' : (Math.abs(stats.levelDiff).toFixed(1)+' niveau(x) '+ (stats.levelDiff<0?'sous':'au-dessus')+' la moyenne')}</div>
      </div>
    </div>
    `;
    content.innerHTML=html;
  });
}

// Statistiques AVANCÉES !
function computeAdvancedStats(quizz){
  if(!quizz||!quizz.length) return {perTablePerc:Object.fromEntries([...Array(12)].map((_,i)=>[i+1,0])), masteredTables:[], worstTables:[], globalPercent:0, level:"Aucun",levelDesc:"Aucune maîtrise encore", levelAvg:"?", levelDiff:"?", age:"?"};
  // Calculs "maîtrisée" : 5 sessions récentes, toutes reps ok pour la table
  let perTable = {}, perTablePerc = {};
  let successSeq = {}, mastered = [];
  for(let i=1;i<=12;i++){perTable[i]=[];successSeq[i]=0;}
  // On cherche la séquence max d'affilée de réussites complètes sur une table
  quizz.forEach(qz=>{
    let done = {};
    qz.results.forEach(res=>{
      let [t,f]=res.q;
      if(!done[t]) done[t]=[];
      done[t].push(res.ok&&!res.timeout);
    });
    for(let t=1;t<=12;t++){
      let ok = done[t] && done[t].length===12 && done[t].every(Boolean);
      perTable[t].push(ok);
    }
  });
  for(let t=1;t<=12;t++){
    // Cherche série max d'affilée
    let maxSeq=0, curr=0, arr=perTable[t];
    for (let v of arr){ curr = v?curr+1:0; if(curr>maxSeq)maxSeq=curr; }
    successSeq[t]=maxSeq;
    if(maxSeq>=5) mastered.push(t);
    perTablePerc[t]=Math.round((arr.filter(Boolean).length/(arr.length||1))*100);
  }
  // Identifie tables faibles : <40% réussite
  let worstTables = [];
  for(let t=1;t<=12;t++) if(perTablePerc[t]<40) worstTables.push(t);

  // Calcule global pondéré : +1 pt/succès, -0.6pt/échec, +0.25pt Qz récent
  let now=Date.now(), global=0,maxg=0;
  quizz.forEach((qz,i)=>{
    let weight = 1+0.25**Math.max(0,(quizz.length-(i+1)));
    qz.results.forEach(r=>{
      if(r.ok && !r.timeout) global+=1.0*weight;
      else global-=(r.timeout ? 0.3 : 0.6)*weight;
      maxg+=weight;
    });
  });
  let globalPercent = Math.max(0,Math.min(100,Math.round((global/(maxg||1))*100)));

  // Niveau scolaire français estimé :
  // MS/GS = 1 (table 1), CP = 2/3 (1,2,5,10 maîtrisées), CE1 = 4 (≤6), CE2 = 7, CM1 = 9, CM2 = 11 ; on affine selon tables par cœur
  let lvl = 0, level="Maternelle", levelDesc = "";
  if(mastered.length==0) level="Maternelle",levelDesc="Commence à découvrir les multiplications";
  else if(mastered.length==1) level="CP",levelDesc="Table de "+mastered[0]+" su par cœur";
  else if([2,5,10].every(x=>mastered.includes(x))) level="CE1",levelDesc="Connaît au moins 2, 5 et 10";
  else if(mastered.length>=6) level="CE2",levelDesc="Demi-maîtrise, la moitié acquise";
  else if(mastered.length>=9) level="CM1",levelDesc="Quasi-totalité acquise, prêt pour CM2";
  else if(mastered.length==12) level="CM2",levelDesc="Maîtrise complète, champion !";
  lvl = {Maternelle:0,CP:1,CE1:3,CE2:6,CM1:9,CM2:12}[level]||0;

  // Récup âge/utilisateur pour stats France
  let userage = "?", avglvl=0, lvlDiff="?";
  let birth = window._userBirthdate;
  // Age 2025
  if(birth && /^\d{4}-\d{2}-\d{2}$/.test(birth)){
    userage = 2025-parseInt(birth.slice(0,4),10);
    // Niveau moyen en France : 7 ans=CP, 8=CE1, 9=CE2, 10=CM1, 11=CM2
    avglvl = userage<=6 ? 0 : userage==7 ? 1 : userage==8 ? 3 : userage==9 ? 6 : userage==10 ? 9 : userage>=11 ? 12 : 0;
    lvlDiff = lvl-avglvl;
  }
  return {
    perTablePerc,
    masteredTables: mastered,
    worstTables,
    globalPercent,
    level,
    levelDesc,
    levelAvg: avglvl,
    levelDiff: lvlDiff,
    age:userage
  };
}

// ---------- PARAMETRES ----------
function renderParametres(){
  const uid = auth.currentUser.uid, settingsRef=ref(db,'settings/'+uid+'/');
  get(settingsRef).then(snap=>{
    let sett = snap.exists()?snap.val():{userName:"",birthdate:""};
    window._userBirthdate = sett.birthdate || "";
    content.innerHTML = `
    <h1 style="font-size:1.14rem;color:var(--accent);font-weight:800;">Paramètres</h1>
    <form id="paramForm" class="param-form">
      <label>Nom d'utilisateur</label>
      <input type="text" id="setUserName" placeholder="Nom d'utilisateur" value="${sett.userName||""}" required>
      <label>Date de naissance (pour les stats)</label>
      <input type="date" id="setUserBirth" value="${sett.birthdate||""}" style="max-width:220px;">
      <div class="param-btns">
        <button class="save-btn" type="submit">Enregistrer</button>
        <button class="reset-btn" type="button" onclick="window.showResetConfirm()">Réinitialiser progression</button>
      </div>
    </form>
    `;
    document.getElementById("paramForm").onsubmit=(e)=>{
      e.preventDefault();
      window._userBirthdate = document.getElementById("setUserBirth").value;
      update(settingsRef, { 
        userName: document.getElementById("setUserName").value.trim(),
        birthdate: window._userBirthdate
      });
      showTablesStatsMenu();
      renderParametres();
    };
  });
}
window.showResetConfirm = ()=>{
  showConfirm("Voulez-vous vraiment réinitialiser toute votre progression ? Cette action est irréversible.",
    ()=>{
      const uid = auth.currentUser.uid;
      set(ref(db,'quizz/'+uid+'/'),[]); set(ref(db,'settings/'+uid+'/'),{});
      renderSuivi();
      showTablesStatsMenu();
    }
  );
};
function showConfirm(msg, yes){
  const confirmLayer=document.getElementById("confirmLayer");
  confirmLayer.innerHTML = `<div class="confirm-box">${msg}<br>
    <button class="main-btn" id="yesBtn">Oui</button>
    <button class="reset-btn" id="noBtn">Non</button>
  </div>`;
  confirmLayer.classList.remove("hidden");
  document.getElementById("yesBtn").onclick=()=>{confirmLayer.classList.add("hidden");yes();};
  document.getElementById("noBtn").onclick=()=>{confirmLayer.classList.add("hidden");};
}

renderPage("tables");
