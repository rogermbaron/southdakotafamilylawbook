const state={data:null, pages:[], current:null, toc:[]};
const $=id=>document.getElementById(id);
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==id)); document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active-nav',b.dataset.view===id)); window.scrollTo(0,0);}
function pageByPrinted(p){return state.pages.find(x=>x.printed_page===String(p));}
function openPage(p){const row=pageByPrinted(p); if(!row)return; state.current=row; showView('book'); renderReader(row); history.replaceState(null,'',`#page=${encodeURIComponent(row.printed_page)}`);}
function renderReader(row){
 const r=$('reader'); r.classList.remove('hidden');
 const idx=state.pages.findIndex(x=>x.printed_page===row.printed_page);
 const prev=idx>0?state.pages[idx-1]:null, next=idx<state.pages.length-1?state.pages[idx+1]:null;
 const section=row.section_heading?escapeHtml(row.section_heading):'';
 const chapter=row.chapter_title?`Chapter ${row.chapter_number} — ${escapeHtml(row.chapter_title)}`:labelType(row.page_type);
 const pdfUrl=`Baron_Family_Law_2010_Master_Digital_Version.pdf#page=${row.master_pdf_page}`;
 r.innerHTML=`<div class="reader-shell">
   <div class="reader-head">
    <div class="reader-title"><div class="kicker">${row.page_type==='numbered'?'PRINTED PAGE':'BOOK PAGE'}</div><h3>Page ${escapeHtml(row.printed_page)}</h3><p class="reader-context">${chapter}</p>${section?`<p class="reader-section">${section}</p>`:''}</div>
    <div class="reader-actions"><button ${prev?'':'disabled'} data-open="${prev?escAttr(prev.printed_page):''}">← Previous</button><button ${next?'':'disabled'} data-open="${next?escAttr(next.printed_page):''}">Next →</button></div>
   </div>
   <div class="reader-note"><strong>2010 printed pagination:</strong> Page ${escapeHtml(row.printed_page)} is the authoritative reference. The PDF page ${row.master_pdf_page} is only the website's internal viewing reference.</div>
   <div class="reader-toolbar"><span>Preserved page image</span><div><a class="reader-link" href="${pdfUrl}" target="_blank" rel="noopener">Open page in new window ↗</a><button data-view="search" class="reader-search">Back to Search</button></div></div>
   <iframe class="pdf-frame" title="Preserved printed page ${escapeHtml(row.printed_page)}" src="${pdfUrl}"></iframe>
   <div class="reader-footer"><span>${prev?`Previous: ${escapeHtml(prev.printed_page)}`:'Beginning of archive'}</span><span>${next?`Next: ${escapeHtml(next.printed_page)}`:'End of archive'}</span></div>
 </div>`;
 r.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openPage(b.dataset.open)));
 const back=r.querySelector('[data-view="search"]'); if(back) back.onclick=()=>showView('search');
}
function labelType(t){return ({preliminary:'Preliminary pages',table_of_contents:'Table of Contents',index:'Original Index'})[t]||'Historical edition';}
function escAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
function escapeHtml(s){return String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

function tocHtml(){
 return state.toc.map((e,i)=>{const cls=e.level==='chapter'?'toc-chapter':(e.level==='section'?'toc-section':'toc-subsection'); const prefix=e.level==='chapter'?e.chapter+'. ':e.marker+'. '; return `<div class="toc-entry ${cls}"><button data-toc-page="${escAttr(e.printed_start)}"><span class="toc-marker">${escapeHtml(prefix)}</span><span>${escapeHtml(e.title)}</span><span class="toc-page">${escapeHtml(e.printed_start)}</span></button></div>`;}).join('');
}
function buildToc(){
 const panel=$('tocPanel'); if(!panel)return; panel.innerHTML=`<div class="toc-head"><div><div class="kicker">ORIGINAL 2010 TABLE OF CONTENTS</div><h3>Table of Contents</h3><p class="muted">The entries below reproduce the audited 2010 TOC structure. Click any entry to open its printed starting page.</p></div><button id="closeToc">Close</button></div>${tocHtml()}`;
 panel.querySelectorAll('[data-toc-page]').forEach(b=>b.addEventListener('click',()=>openPage(b.dataset.tocPage)));
 $('closeToc').onclick=()=>panel.classList.add('hidden');
}

function buildBookNav(){
 const nav=state.data.navigation.filter(x=>x.parent===2);
 const grouped=document.createElement('div'); grouped.className='book-sections';
 nav.forEach(n=>{const b=document.createElement('button'); b.className=n.type==='chapter'?'book-row chapter-row':'book-row'; b.innerHTML=`<span>${escapeHtml(n.label)}</span><small>${n.start&&n.end?`pp. ${escapeHtml(n.start)}–${escapeHtml(n.end)}`:''}</small>`; b.onclick=()=>{
   if(n.type==='index') openPage('xxv'); else if(n.type==='preliminary') openPage('i'); else if(n.type==='toc') openPage('ix'); else if(n.target!=null) openPage(String(n.target));
 }; grouped.appendChild(b);});
 $('bookNav').innerHTML=''; $('bookNav').appendChild(grouped);
 const sel=$('chapterSelect'); state.data.navigation.filter(x=>x.type==='chapter').forEach(n=>{const o=document.createElement('option');o.value=n.target;o.textContent=`${n.label} (pp. ${n.start}–${n.end})`;sel.appendChild(o)});
 sel.onchange=()=>{if(sel.value)openPage(sel.value)};
}
function resultCard(x){return `<article class="result-card"><div class="result-top"><span class="page-pill">p. ${escapeHtml(x.printed_page)}</span><span>${escapeHtml(x.chapter_title||labelType(x.page_type||''))}</span></div><h3>${escapeHtml(x.section_heading||'Page '+x.printed_page)}</h3><p>${x.snippet||'Match found on this page.'}</p><button data-open="${escAttr(x.printed_page)}">View printed page ${escapeHtml(x.printed_page)}</button></article>`;}
async function search(q){if(!q)return; $('searchMeta').textContent='Searching the preserved 2010 text…'; $('results').innerHTML=''; const r=await fetch('/api/search?q='+encodeURIComponent(q)).then(x=>x.json()); $('searchMeta').textContent=`${r.results.length} page result${r.results.length===1?'':'s'}${r.authorities?.length?` · ${r.authorities.length} authority match${r.authorities.length===1?'':'es'}`:''}`; $('results').innerHTML=(r.results.length?r.results.map(resultCard).join(''):`<div class="empty">No page matches were found.</div>`)+(r.authorities?.length?`<div class="authority-results"><h3>Indexed authorities</h3>${r.authorities.map(a=>`<div class="authority-row"><strong>${escapeHtml(a.authority)}</strong><span>${escapeHtml(a.type)} · first page ${escapeHtml(a.first_page)}</span><button data-open="${escAttr(a.first_page)}">Open</button></div>`).join('')}</div>`:''); bindOpenButtons();}
function bindOpenButtons(){document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPage(b.dataset.open));}
async function searchIndex(q){if(!q){$('indexResults').innerHTML='';return;} const r=await fetch('/api/index-search?q='+encodeURIComponent(q)).then(x=>x.json()); $('indexResults').innerHTML=r.results?.length?r.results.map(resultCard).join(''):`<div class="empty">No matches were found in the searchable Index pages.</div>`; bindOpenButtons();}
function buildIndexPageList(){const pages=state.pages.filter(p=>p.page_type==='index'); const el=$('indexPageList'); if(!el)return; el.innerHTML=pages.map(p=>`<button data-open="${escAttr(p.printed_page)}">${escapeHtml(p.printed_page)}</button>`).join(''); el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPage(b.dataset.open));}

async function init(){
 state.data=await fetch('site-data.json').then(r=>r.json()); state.pages=state.data.pages; state.toc=await fetch('toc-data.json').then(r=>r.json());
 buildBookNav(); buildToc(); buildIndexPageList(); $('openToc').onclick=()=>{ $('tocPanel').classList.remove('hidden'); $('tocPanel').scrollIntoView({behavior:'smooth',block:'start'}); };
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
 $('searchForm').addEventListener('submit',e=>{e.preventDefault();search($('query').value.trim())});
 $('indexForm').addEventListener('submit',e=>{e.preventDefault();searchIndex($('indexQuery').value.trim())});
 $('openIndex').onclick=()=>openPage('xxv');
 const m=location.hash.match(/^#page=(.+)$/); if(m&&pageByPrinted(decodeURIComponent(m[1])))openPage(decodeURIComponent(m[1])); else showView('home');
}
init();
