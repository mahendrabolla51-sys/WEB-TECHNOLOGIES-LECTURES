/* app.js - shared behavior for pages */

document.addEventListener('DOMContentLoaded', ()=>{

  // NAV brand link (if present)
  const brandLinks = document.querySelectorAll('.go-home');
  brandLinks.forEach(a=>a.addEventListener('click', ()=> location.href='index.html'));

  /* -------- Login page: toggle student/admin -------- */
  const authToggle = document.getElementById('authToggle');
  if(authToggle){
    authToggle.addEventListener('change', (e)=>{
      const val = e.target.value;
      document.querySelectorAll('.auth-form').forEach(f=> f.style.display='none');
      const el = document.getElementById(val + 'Form');
      if(el) el.style.display='block';
    });
    // init
    if(authToggle.value) authToggle.dispatchEvent(new Event('change'));
  }

  /* -------- password confirmation feedback on register page -------- */
  const pwd = document.getElementById('password');
  const cpwd = document.getElementById('confirmPassword');
  if(pwd && cpwd){
    function checkPwd(){ 
      const msg = document.getElementById('pwdMsg');
      if(!cpwd.value) { msg.textContent=''; return; }
      if(pwd.value !== cpwd.value){ msg.textContent='Passwords do not match'; msg.style.color='var(--danger)'; }
      else { msg.textContent='Passwords match ✓'; msg.style.color='var(--success)'; }
    }
    pwd.addEventListener('input', checkPwd);
    cpwd.addEventListener('input', checkPwd);
  }

  /* -------- Form small animations: focus effects -------- */
  document.querySelectorAll('input,select,textarea').forEach(inp=>{
    inp.addEventListener('focus', ()=> inp.style.transform='translateY(-2px)');
    inp.addEventListener('blur', ()=> inp.style.transform='translateY(0)');
  });

  /* -------- Test page flow (start, timer, questions) -------- */
  if(document.getElementById('startTestBtn')){
    // sample MCQs - in real app would be fetched from backend
    const questions = [
      {id:1, q:'What is the output of 1+ "2" in JavaScript?', opts:['3','"12"','TypeError','NaN'], ans:1},
      {id:2, q:'Which normal form prevents duplicate groups?', opts:['1NF','2NF','3NF','BCNF'], ans:0},
      {id:3, q:'Which is NOT OOP concept?', opts:['Encapsulation','Polymorphism','Recursion','Inheritance'], ans:2},
      {id:4, q:'Which SQL command removes table completely?', opts:['DROP','DELETE','TRUNCATE','REMOVE'], ans:0},
      {id:5, q:'Which is a NoSQL DB?', opts:['MySQL','MongoDB','Postgres','Oracle'], ans:1}
    ];

    let attempt = {meta:null, answers:[], current:0, timerId:null, timeLeft:30*60}; // 30 minutes

    const startBtn = document.getElementById('startTestBtn');
    const testDetailsForm = document.getElementById('testDetails');
    const qArea = document.getElementById('questionArea');
    const timeEl = document.getElementById('countdown');

    function renderQuestion(){
      const q = questions[attempt.current];
      qArea.innerHTML = `
        <div class="qcard">
          <div style="font-weight:800">Q${attempt.current+1}. ${q.q}</div>
          <div class="options" id="opts">
            ${q.opts.map((o,i)=>`<div class="option" data-idx="${i}">${String.fromCharCode(65+i)}. ${o}</div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button class="btn ghost" id="prevBtn" ${attempt.current===0?'disabled':''}>Previous</button>
            <button class="btn" id="nextBtn">${attempt.current===questions.length-1?'Review & Submit':'Next'}</button>
          </div>
        </div>
      `;
      // reapply selection highlight
      const opts = document.querySelectorAll('#opts .option');
      opts.forEach(o=>{
        o.addEventListener('click', ()=>{
          opts.forEach(x=>x.classList.remove('selected'));
          o.classList.add('selected');
          attempt.answers[attempt.current] = parseInt(o.dataset.idx);
        });
      });
      // restore previously selected
      const sel = attempt.answers[attempt.current];
      if(typeof sel === 'number'){
        const chosen = document.querySelector(`#opts .option[data-idx="${sel}"]`);
        if(chosen) chosen.classList.add('selected');
      }
      // prev/next handlers
      document.getElementById('prevBtn').addEventListener('click', ()=>{
        if(attempt.current>0){ attempt.current--; renderQuestion(); }
      });
      document.getElementById('nextBtn').addEventListener('click', ()=>{
        if(attempt.current < questions.length-1){ attempt.current++; renderQuestion(); }
        else { // reached last -> show review / submit modal area
          showSubmitReview();
        }
      });
    }

    function showSubmitReview(){
      qArea.innerHTML = `<div class="qcard"><h3>Review Answers</h3>
        <p class="small">You have attempted ${attempt.answers.filter(a=>typeof a==='number').length} / ${questions.length}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="btn ghost" id="backBtn">Back to Questions</button>
          <button class="btn" id="finishBtn">Submit Test</button>
        </div>
      </div>`;
      document.getElementById('backBtn').addEventListener('click', ()=>{ attempt.current = 0; renderQuestion(); });
      document.getElementById('finishBtn').addEventListener('click', finishTest);
    }

    function finishTest(){
      clearInterval(attempt.timerId);
      // very simple scoring: count correct
      const correct = questions.reduce((s,q,i)=> s + ((attempt.answers[i] === q.ans)?1:0), 0);
      const total = questions.length;
      const percent = Math.round((correct/total)*100);
      // save to localStorage under roll
      const roll = attempt.meta.roll || 'unknown';
      const record = JSON.parse(localStorage.getItem('exampro_results')||'{}');
      const student = record[roll] || {roll, attempts:[]};
      student.attempts.push({
        date: new Date().toLocaleString(),
        course: attempt.meta.course || 'Demo Course',
        score: percent,
        raw: correct + '/' + total
      });
      record[roll] = student;
      localStorage.setItem('exampro_results', JSON.stringify(record));
      // show summary
      qArea.innerHTML = `<div class="qcard"><h3>Test Submitted</h3>
        <p class="small">Score: <strong>${percent}%</strong> (${correct}/${total})</p>
        <p class="small">Answers stored. You may view results page.</p>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn" onclick="location.href='results.html'">Go to Results</button>
        </div>
      </div>`;
    }

    function startTimer(){
      const tick = ()=>{
        if(attempt.timeLeft<=0){ clearInterval(attempt.timerId); finishTest(); return; }
        attempt.timeLeft--;
        let mins = Math.floor(attempt.timeLeft/60).toString().padStart(2,'0');
        let secs = (attempt.timeLeft%60).toString().padStart(2,'0');
        timeEl.textContent = `${mins}:${secs}`;
      };
      attempt.timerId = setInterval(tick,1000);
      tick();
    }

    startBtn.addEventListener('click', (ev)=>{
      ev.preventDefault();
      // gather test details
      const fd = new FormData(testDetailsForm);
      const meta = Object.fromEntries(fd.entries());
      if(!meta.roll || !meta.coursecode){ alert('Please enter required details (Course Code and Roll)'); return; }
      attempt.meta = meta;
      // hide details, show questions / timer
      document.getElementById('testMeta').style.display='none';
      document.getElementById('testMain').style.display='block';
      startTimer();
      renderQuestion();
    });
  }

  /* -------- Results page: lookup and display -------- */
  if(document.getElementById('resultsLookup')){
    document.getElementById('resultsLookup').addEventListener('submit', (e)=>{
      e.preventDefault();
      const roll = e.target.roll.value.trim();
      const container = document.getElementById('resultsArea');
      container.innerHTML = '';
      if(!roll){ container.innerHTML='<p class="small">Enter a roll number</p>'; return; }
      const record = JSON.parse(localStorage.getItem('exampro_results')||'{}');
      const student = record[roll];
      if(!student){ container.innerHTML='<p class="small">No results found for this roll.</p>'; return; }
      // Example table: sno, course code, course name, credit points (we'll use sample data)
      container.innerHTML = `
        <table class="table">
          <thead><tr><th>Sno</th><th>Course Code</th><th>Course Name</th><th>Credit Points</th><th>Marks (%)</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>23CXDF</td><td>DBMS</td><td>4.0</td><td>20.0</td></tr>
            <tr><td>2</td><td>23ANHF</td><td>C++</td><td>4.0</td><td>20.0</td></tr>
          </tbody>
        </table>
        <div class="result-summary">
          <div><strong>SGPA:</strong> 9.0</div>
          <div style="margin-top:6px"><strong>CGPA:</strong> 8.6</div>
        </div>
      `;
    });
  }

});
