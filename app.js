(async()=>{
  const root=document.getElementById('lake-glass-mockup');
  if(!root||root.dataset.init==='1') return;
  root.dataset.init='1';

  if(!window.LAKEGLASS_DATA){
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='data.js';
      s.onload=resolve;
      s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  const {GLASS_COLORS,REGIONS}=window.LAKEGLASS_DATA;
  const state={region:'chicago',color:'aqua',thickness:'thin',form:'curved',opacity:'transparent',mark:'smooth',diagnostic:null,diagnosticKey:null};
  const screens=[...root.querySelectorAll('.screen')];
  const navButtons=[...root.querySelectorAll('.nav button')];

  function show(name){
    screens.forEach(s=>s.classList.toggle('active',s.dataset.screen===name));
    navButtons.forEach(b=>b.classList.toggle('active',b.dataset.go===name));
  }

  root.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>show(btn.dataset.go)));

  const colorChoices=root.querySelector('#colorChoices');
  GLASS_COLORS.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='swatch'+(c.id==='aqua'?' selected':'');
    btn.type='button';
    btn.dataset.value=c.id;
    btn.innerHTML=`<span class="swatch-dot" style="background:${c.hex}"></span><span>${c.name}</span>`;
    btn.addEventListener('click',()=>{
      state.color=c.id;
      colorChoices.querySelectorAll('.swatch').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected');
      renderDiagnostic();
    });
    colorChoices.appendChild(btn);
  });

  root.querySelectorAll('[data-group]').forEach(group=>{
    group.querySelectorAll('.choice').forEach(btn=>btn.addEventListener('click',()=>{
      state[group.dataset.group]=btn.dataset.value;
      group.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected');
      renderDiagnostic();
    }));
  });

  function getDiagnosticConfig(){
    if(state.mark==='letters') return {key:'embossing',question:'What kind of mark survives?',help:'Even a partial mark can be more useful than color.',options:[['letters','Letters or a word'],['numbers','Numbers only'],['symbol','Symbol or maker mark'],['unclear','Too partial to tell']]};
    if(state.form==='rim'||state.form==='neck') return {key:'seam',question:'What does the mold seam do near the finish?',help:'The seam-to-finish relationship can help separate mouth-blown from machine-made manufacture.',options:[['through','Continues through the lip / finish'],['stops','Stops below the lip / finish'],['noseam','No seam visible'],['unclear','Hard to tell']]};
    if(state.form==='base') return {key:'base',question:'What is visible on the base?',help:'Base scars, rings, and embossing are especially useful manufacturing clues.',options:[['pontil','Rough or polished circular scar'],['machine','Smooth concentric machine ring'],['embossed','Letters, numbers, or maker mark'],['plain','No obvious feature'],['unclear','Hard to tell']]};
    if(state.color==='black') return {key:'backlight',question:'What color appears under strong backlight?',help:'Most “black” beach glass is actually a very deep color.',options:[['olive','Olive / green'],['brown','Brown / amber'],['bluepurple','Blue / purple'],['black','Still appears black'],['unclear','Hard to tell']]};
    if(state.color==='milkglass') return {key:'milk',question:'Does light pass through the piece?',help:'True milk glass is opaque rather than simply heavily frosted.',options:[['opaque','No light passes through'],['soft','Only a soft glow passes through'],['clear','Light passes clearly through'],['unclear','Hard to tell']]};
    if(state.color==='slag') return {key:'slag',question:'Does it look glassy or stone-like?',help:'Industrial slag often has inclusions, irregular texture, or a rock-like mass rather than vessel geometry.',options:[['stone','Stone-like with inclusions'],['glassy','Smooth glassy mass'],['vessel','Curved like a vessel wall'],['unclear','Hard to tell']]};
    return null;
  }

  function renderDiagnostic(){
    const group=root.querySelector('#diagnosticGroup');
    const config=getDiagnosticConfig();
    if(!config){
      group.hidden=true;
      state.diagnostic=null;
      state.diagnosticKey=null;
      return;
    }
    group.hidden=false;
    if(state.diagnosticKey!==config.key){
      state.diagnostic=null;
      state.diagnosticKey=config.key;
    }
    root.querySelector('#diagnosticQuestion').textContent=config.question;
    root.querySelector('#diagnosticHelp').textContent=config.help;
    const wrap=root.querySelector('#diagnosticChoices');
    wrap.innerHTML='';
    config.options.forEach(([value,label])=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='choice'+(state.diagnostic===value?' selected':'');
      btn.dataset.value=value;
      btn.textContent=label;
      btn.addEventListener('click',()=>{
        state.diagnostic=value;
        wrap.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
      });
      wrap.appendChild(btn);
    });
  }

  const ACCESSION_CODES={
    white:'CLEAR',brown:'AMBER',aqua:'AQUA',seafoam:'SEAFOAM',green:'GREEN',olive:'OLIVE',lime:'LIME',
    cobalt:'COBALT',darkaqua:'DARKAQUA',teal:'TEAL',milkglass:'MILK',lavender:'LAVENDER',pink:'PINK',
    purple:'PURPLE',gray:'GRAY',yellow:'YELLOW',opalescent:'OPALESCENT',canary:'CANARY',black:'BLACK',
    red:'RED',orange:'ORANGE',slag:'SLAG',unclassified:'UNC'
  };
  const LEGACY_DEMO_IDS=new Set(['LM-042','LM-041','LM-040','LM-039']);
  const savedSpecimens=[];
  const ARCHIVE_DB='lakeglass-archive';
  const ARCHIVE_STORE='collection';
  let currentSpecimenCode='';

  function accessionCodeFor(colorId){
    return ACCESSION_CODES[colorId]||'UNC';
  }

  function inferColorId(d){
    const requested=String(d?.accessionColor||d?.colorId||'');
    if(GLASS_COLORS.some(c=>c.id===requested)) return requested;
    const hex=String(d?.color||'').trim().toLowerCase();
    const byHex=GLASS_COLORS.find(c=>String(c.hex||'').toLowerCase()===hex);
    if(byHex) return byHex.id;
    const name=String(d?.name||'').trim().toLowerCase();
    const byName=GLASS_COLORS.find(c=>c.name.toLowerCase()===name);
    if(byName) return byName.id;
    if(name.includes('clear')||name.includes('white')) return 'white';
    if(name.includes('amber')||name.includes('brown')) return 'brown';
    if(name.includes('aqua')&&!name.includes('dark')) return 'aqua';
    if(name.includes('green')&&!name.includes('olive')&&!name.includes('lime')) return 'green';
    return 'unclassified';
  }

  function accessionNumberFromId(id,colorId){
    const match=String(id||'').match(/^LM\.([A-Z0-9]+)\.(\d+)$/);
    if(!match||match[1]!==accessionCodeFor(colorId)) return null;
    const n=Number(match[2]);
    return Number.isInteger(n)&&n>0?n:null;
  }

  function nextAccession(colorId){
    let max=0;
    savedSpecimens.forEach(d=>{
      const dColor=inferColorId(d);
      if(dColor!==colorId) return;
      const n=Number(d.accessionNumber)||accessionNumberFromId(d.id,dColor)||0;
      if(n>max) max=n;
    });
    const number=max+1;
    return {number,id:`LM.${accessionCodeFor(colorId)}.${String(number).padStart(3,'0')}`};
  }

  function cleanArchiveRows(rows){
    if(!Array.isArray(rows)) return [];
    return rows.filter(d=>d&&typeof d==='object'&&!LEGACY_DEMO_IDS.has(String(d.id||''))).map(d=>({...d}));
  }

  function normalizeAccessionRows(rows){
    const clean=cleanArchiveRows(rows);
    const maxima={};
    const used={};

    clean.forEach(d=>{
      const colorId=inferColorId(d);
      d.accessionColor=colorId;
      const existing=Number(d.accessionNumber)||accessionNumberFromId(d.id,colorId);
      if(existing&&(!used[colorId]||!used[colorId].has(existing))){
        if(!used[colorId]) used[colorId]=new Set();
        used[colorId].add(existing);
        d.accessionNumber=existing;
        d.id=`LM.${accessionCodeFor(colorId)}.${String(existing).padStart(3,'0')}`;
        maxima[colorId]=Math.max(maxima[colorId]||0,existing);
      }else{
        d.accessionNumber=null;
      }
    });

    [...clean].reverse().forEach(d=>{
      if(d.accessionNumber) return;
      const colorId=d.accessionColor||'unclassified';
      const number=(maxima[colorId]||0)+1;
      maxima[colorId]=number;
      if(!used[colorId]) used[colorId]=new Set();
      used[colorId].add(number);
      d.accessionNumber=number;
      d.id=`LM.${accessionCodeFor(colorId)}.${String(number).padStart(3,'0')}`;
    });

    return clean;
  }

  function rarityLabel(score){
    if(score<=1) return 'Common color';
    if(score<=3) return 'Familiar find';
    if(score<=5) return 'Uncommon color';
    if(score<=7) return 'Rare find';
    if(score<=9) return 'Very rare find';
    return 'Exceptional find';
  }

  function shortThickness(value){
    return value==='thin'?'Thin bottle-wall glass':value==='medium'?'Medium-weight glass':'Thick / heavy glass';
  }

  function shortMark(value){
    if(value==='letters') return 'Embossed / marked';
    if(value==='ripple') return 'Rippled flat-glass clue';
    if(value==='rough') return 'Lighter weathering';
    return 'Heavily frosted';
  }

  function shortForm(value){
    return ({curved:'Curved vessel wall',flat:'Flat fragment',rim:'Rim / lip fragment',base:'Base / heel fragment',neck:'Bottle neck',unknown:'Form uncertain'})[value]||'Form uncertain';
  }

  function formScore(value){
    return ({curved:2,flat:3,rim:7,base:6,neck:6,unknown:1})[value]||1;
  }

  function historyScore(){
    let score=3;
    if(state.mark==='letters') score+=4;
    if(state.form==='rim'||state.form==='base'||state.form==='neck') score+=2;
    if(state.color==='lavender'||state.color==='red'||state.color==='slag'||state.color==='black') score+=1;
    return Math.min(10,score);
  }

  function evaluateSpecimen(color){
    const scores={bottle:0,jar:0,flat:0,decorative:0,slag:0,insulator:0};
    const evidence=[];
    const cautions=[];
    const add=(type,points,reason)=>{scores[type]+=points;if(reason)evidence.push(reason);};

    if(state.form==='curved'){add('bottle',4,'Curved vessel wall strongly supports container glass.');add('jar',1);}
    if(state.form==='flat'){add('flat',4,'Flat form favors window, plate, or other flat glass.');}
    if(state.form==='rim'){add('bottle',5,'A rim or lip is a diagnostic vessel feature.');add('jar',2);}
    if(state.form==='base'){add('bottle',3,'A base or heel supports a vessel identification.');add('jar',3);}
    if(state.form==='neck'){add('bottle',5,'A neck profile strongly supports a bottle.');}

    if(state.mark==='letters'){add('bottle',3,'Embossing is a high-value manufacturing clue.');add('jar',2);}
    if(state.mark==='ripple'){add('flat',5,'A rippled surface strongly favors older flat glass.');}
    if(state.mark==='smooth') evidence.push('Even frosting supports prolonged shoreline weathering.');
    if(state.mark==='rough') evidence.push('Remaining gloss or sharpness suggests lighter shoreline weathering.');

    if(state.thickness==='thin'){add('bottle',2,'Thin glass is consistent with bottle-wall construction.');add('flat',1);}
    if(state.thickness==='medium'){add('jar',2,'Medium thickness fits heavier containers or tableware.');add('bottle',1);}
    if(state.thickness==='thick'){add('slag',2,'Heavy thickness raises industrial-slag potential.');add('insulator',2,'Heavy thickness can fit utility or insulator glass.');add('bottle',1);}

    if(state.opacity==='transparent'){add('bottle',1);add('flat',1);}
    if(state.opacity==='opaque'&&color.id==='milkglass'){add('jar',5,'Opaque white strongly supports milk glass.');add('decorative',2);}
    if(state.opacity==='opaque'&&color.id==='slag'){add('slag',4,'Opaque or near-opaque material supports an industrial-slag reading.');}

    if(['white','brown','aqua','seafoam','green','olive','lime','darkaqua','teal'].includes(color.id)) add('bottle',2,'The selected color is compatible with historic utility-container glass.');
    if(color.id==='cobalt'){add('bottle',2,'Cobalt is compatible with medicine and specialty bottles.');add('decorative',2);}
    if(['lavender','pink','purple','gray','yellow','opalescent','canary','red','orange'].includes(color.id)) add('decorative',3,'The color raises the likelihood of decorative or specialty glass.');
    if(color.id==='teal'){add('jar',2,'Teal was also used for utilitarian jars and containers.');add('insulator',1,'Teal appears in historic electrical insulators as well as vessels.');}
    if(color.id==='darkaqua'){add('insulator',2,'Dark aqua can appear in historic electrical insulators.');add('decorative',1);}
    if(color.id==='milkglass'){add('jar',3,'Milk glass commonly appears in cosmetic, ointment, and household containers.');}
    if(color.id==='slag'){add('slag',6,'The selected material profile directly supports industrial slag.');}
    if(color.id==='black'){add('bottle',2,'Near-black pieces are often very deeply colored bottle glass.');add('slag',1);}

    if(color.id==='slag'&&state.region==='michigan') add('slag',2,'Michigan shoreline context strengthens the slag hypothesis.');
    if(state.diagnosticKey==='seam'&&state.diagnostic==='through') add('bottle',3,'A mold seam continuing through the finish supports machine-made bottle manufacture.');
    if(state.diagnosticKey==='seam'&&state.diagnostic==='stops') add('bottle',3,'A seam stopping below the finish supports a mouth-blown manufacture hypothesis.');
    if(state.diagnosticKey==='base'&&state.diagnostic==='pontil') add('bottle',4,'A circular pontil-type scar is a strong older-manufacture clue.');
    if(state.diagnosticKey==='base'&&state.diagnostic==='machine') add('bottle',3,'A smooth concentric machine ring supports machine-made manufacture.');
    if(state.diagnosticKey==='base'&&state.diagnostic==='embossed') add('bottle',4,'Embossing on the base is a strong maker or manufacturing clue.');
    if(state.diagnosticKey==='embossing'&&state.diagnostic==='letters') add('bottle',3,'Surviving lettering may support maker- or product-level research.');
    if(state.diagnosticKey==='embossing'&&state.diagnostic==='symbol') add('bottle',2,'A maker symbol can be historically diagnostic even without readable text.');
    if(state.diagnosticKey==='milk'&&state.diagnostic==='opaque') add('jar',3,'Confirmed opacity strengthens a true milk-glass reading.');
    if(state.diagnosticKey==='slag'&&state.diagnostic==='stone') add('slag',4,'Stone-like texture and inclusions strongly support industrial slag.');

    if(state.diagnosticKey==='slag'&&state.diagnostic==='vessel') cautions.push('Vessel-like curvature conflicts with an industrial-slag identification.');
    if(state.diagnosticKey==='milk'&&state.diagnostic==='clear') cautions.push('Clear light transmission conflicts with true milk glass and suggests heavily frosted clear glass instead.');
    if(color.id==='slag'&&state.form==='curved'&&state.thickness==='thin') cautions.push('Thin curved vessel glass conflicts with an industrial-slag identification.');
    if(color.id==='milkglass'&&state.opacity!=='opaque') cautions.push('Milk glass is normally opaque; heavily frosted clear glass may be a better match.');
    if(color.id==='black'&&state.opacity==='transparent') cautions.push('Near-black transparent glass may reveal an underlying olive or amber hue in stronger light.');
    if(state.form==='flat'&&state.mark!=='ripple'&&state.thickness==='thin') cautions.push('Thin flat glass can overlap with both window glass and flattened container fragments.');

    const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const [top,second]=ranked;
    const margin=top[1]-second[1];
    const diagnostic=(state.form==='rim'||state.form==='base'||state.form==='neck'||state.mark==='letters'||state.mark==='ripple');
    let strength='Possible';
    if(top[1]>=8&&margin>=3&&diagnostic) strength='Distinctive match';
    else if(top[1]>=6&&margin>=2) strength='Strong match';
    else if(top[1]>=4) strength='Good match';

    const labels={bottle:'Bottle / container glass',jar:'Jar or heavier container',flat:'Flat / window glass',decorative:'Decorative or specialty glass',slag:'Industrial slag',insulator:'Utility / insulator glass'};
    return {scores,ranked,topType:top[0],topScore:top[1],secondScore:second[1],label:labels[top[0]],strength,evidence,cautions};
  }

  function diagnosticLabel(){
    const labels={
      seam:{through:'Seam continues through finish',stops:'Seam stops below finish',noseam:'No seam visible',unclear:'Seam unclear'},
      base:{pontil:'Circular base scar',machine:'Concentric machine ring',embossed:'Embossed base',plain:'Plain base',unclear:'Base feature unclear'},
      embossing:{letters:'Readable letters / word',numbers:'Numbers only',symbol:'Symbol / maker mark',unclear:'Partial mark'},
      backlight:{olive:'Backlights olive / green',brown:'Backlights brown / amber',bluepurple:'Backlights blue / purple',black:'Still appears black',unclear:'Backlit color unclear'},
      milk:{opaque:'Confirmed opaque',soft:'Soft glow only',clear:'Transmits clear light',unclear:'Opacity unclear'},
      slag:{stone:'Stone-like with inclusions',glassy:'Smooth glassy mass',vessel:'Vessel-like curvature',unclear:'Texture unclear'}
    };
    return state.diagnosticKey&&state.diagnostic?(labels[state.diagnosticKey]?.[state.diagnostic]||'Diagnostic clue recorded'):'No diagnostic feature recorded';
  }

  function periodReading(){
    if(state.diagnosticKey==='seam'&&state.diagnostic==='through') return 'Machine-made manufacture likely';
    if(state.diagnosticKey==='seam'&&state.diagnostic==='stops') return 'Mouth-blown manufacture possible';
    if(state.diagnosticKey==='base'&&state.diagnostic==='pontil') return 'Earlier mouth-blown manufacture possible';
    if(state.diagnosticKey==='base'&&state.diagnostic==='machine') return 'Machine-made manufacture likely';
    if((state.diagnosticKey==='base'&&state.diagnostic==='embossed')||(state.diagnosticKey==='embossing'&&state.diagnostic)) return 'Diagnostic dating clue present';
    return 'Not enough evidence';
  }

  function renderResult(){
    const color=GLASS_COLORS.find(c=>c.id===state.color)||GLASS_COLORS[2];
    const region=REGIONS[state.region]||REGIONS.unsure;
    const regional=color&&region.colorNote[color.id];
    const reading=evaluateSpecimen(color);
    currentSpecimenCode=nextAccession(color.id).id;

    root.querySelector('#resultSpecNo').textContent=`Next accession · ${currentSpecimenCode}`;
    root.querySelector('#resultName').textContent=color.name;
    root.querySelector('#resultRegion').textContent=`${region.label} · Lake Michigan`;
    root.querySelector('#rarityFill').style.width=`${color.rarity*10}%`;
    root.querySelector('#rarityValue').textContent=`${color.rarity} / 10`;
    root.querySelector('#resultStone').style.background=`linear-gradient(145deg,rgba(255,255,255,.52),${color.hex} 62%,${color.hex})`;
    root.querySelector('#resultSummary').innerHTML=`Best current match: <em>${reading.label.toLowerCase()}</em>. ${reading.evidence[0]||'The available clues support a cautious field identification.'}`;
    root.querySelector('#rarityPill').textContent=rarityLabel(color.rarity);
    root.querySelector('#shorePill').textContent=`${region.label} shoreline`;
    root.querySelector('#wearPill').textContent=shortMark(state.mark);
    root.querySelector('#strengthPill').textContent=reading.strength;
    root.querySelector('#originText').textContent=reading.label;
    root.querySelector('#thicknessText').textContent=shortThickness(state.thickness);
    root.querySelector('#formText').textContent=shortForm(state.form);
    root.querySelector('#opacityText').textContent=state.opacity.charAt(0).toUpperCase()+state.opacity.slice(1);
    root.querySelector('#markText').textContent=shortMark(state.mark);
    root.querySelector('#diagnosticText').textContent=diagnosticLabel();
    root.querySelector('#periodText').textContent=periodReading();
    root.querySelector('#regionalClue').textContent=regional||`${region.label} context supports a cautious regional reading.`;
    root.querySelector('#colorNote').textContent=`${color.note} ${reading.evidence.slice(0,3).join(' ')}`;
    root.querySelector('#regionSpecificText').textContent=regional||'No strong color-specific regional clue is available for this combination.';
    root.querySelector('#regionalHistory').textContent=region.blurb;
    root.querySelector('#researchBasis').textContent=[...(color.refs||[]),...(region.refs||[])].filter((v,i,a)=>a.indexOf(v)===i).join(' · ')+'.';
    root.querySelector('#interpretationText').textContent='This reading weights diagnostic form and markings more heavily than color. Thickness, opacity, weathering, and shoreline context provide supporting evidence. Color alone does not establish age or function.';

    const fs=formScore(state.form);
    const hs=historyScore();
    root.querySelector('#colorRating').style.width=`${color.rarity*10}%`;
    root.querySelector('#colorRatingValue').textContent=`${color.rarity} / 10`;
    root.querySelector('#formRating').style.width=`${fs*10}%`;
    root.querySelector('#formRatingValue').textContent=`${fs} / 10`;
    root.querySelector('#historyRating').style.width=`${hs*10}%`;
    root.querySelector('#historyRatingValue').textContent=`${hs} / 10`;

    const place=root.querySelector('#foundAt').value.trim();
    const date=root.querySelector('#foundDate').value;
    const note=root.querySelector('#collectorNote').value.trim();
    root.querySelector('#knownPlace').textContent=place||'Not recorded';
    root.querySelector('#knownDate').textContent=date?new Date(date+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Not recorded';
    root.querySelector('#knownNote').textContent=note||'No collector note recorded.';

    const unresolved=state.form==='unknown'||reading.cautions.length>0||(reading.topScore-reading.secondScore<2);
    root.querySelector('#uncertainNote').hidden=!unresolved;
    if(unresolved){
      root.querySelector('#uncertainText').textContent=reading.cautions[0]||(state.form==='unknown'?'The form is unresolved. Look for curvature, a rim, a base edge, or a neck profile to narrow the source.':'Two object classes remain close. Look for a mold seam, lip, base edge, embossing, or true curvature before treating the identification as settled.');
    }

    const tags=root.querySelector('#sourceTags');
    tags.innerHTML='';
    [reading.label,...color.sources].forEach(source=>{
      const tag=document.createElement('span');
      tag.className='source-tag';
      tag.textContent=source;
      tags.appendChild(tag);
    });
  }

  renderDiagnostic();
  root.querySelector('#analyzeBtn').addEventListener('click',()=>{renderResult();show('result');});

  function openArchiveDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){resolve(null);return;}
      const req=indexedDB.open(ARCHIVE_DB,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(ARCHIVE_STORE)) db.createObjectStore(ARCHIVE_STORE);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function persistSavedSpecimens(){
    try{
      const db=await openArchiveDb();
      if(!db) return;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(ARCHIVE_STORE,'readwrite');
        tx.objectStore(ARCHIVE_STORE).put(savedSpecimens,'specimens');
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
      });
      db.close();
    }catch(err){}
  }

  async function restoreSavedSpecimens(){
    try{
      const db=await openArchiveDb();
      if(!db) return;
      const rows=await new Promise((resolve,reject)=>{
        const tx=db.transaction(ARCHIVE_STORE,'readonly');
        const req=tx.objectStore(ARCHIVE_STORE).get('specimens');
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
      });
      db.close();

      if(Array.isArray(rows)){
        const normalized=normalizeAccessionRows(rows);
        const changed=JSON.stringify(normalized)!==JSON.stringify(rows);
        savedSpecimens.splice(0,savedSpecimens.length,...normalized);
        if(changed) await persistSavedSpecimens();
      }
      renderCollection();
    }catch(err){
      renderCollection();
    }
  }

  function specimenBeach(d){
    const first=String(d.provenance||'').split(' · ')[0].trim();
    if(!first||first==='Not recorded'||first==='Chicago area'||first==='Milwaukee area'||first==='Michigan shoreline'||first==='Lake Michigan') return null;
    return first;
  }

  function ensureArchiveNavigation(){
    const home=root.querySelector('[data-screen="home"]');
    if(!home) return;

    const firstMetric=home.querySelector('.metrics .metric');
    if(firstMetric&&!firstMetric.dataset.archiveBound){
      firstMetric.dataset.archiveBound='1';
      firstMetric.classList.add('metric-link');
      firstMetric.tabIndex=0;
      firstMetric.setAttribute('role','button');
      firstMetric.setAttribute('aria-label','View full specimen collection');
      firstMetric.addEventListener('click',()=>show('collection'));
      firstMetric.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();show('collection');}
      });
    }

    const label=home.querySelector('.section-label');
    if(label&&!home.querySelector('.home-archive-heading')){
      const heading=document.createElement('div');
      heading.className='home-archive-heading';
      const view=document.createElement('button');
      view.className='view-collection-btn';
      view.type='button';
      view.textContent='View collection →';
      view.addEventListener('click',()=>show('collection'));
      label.before(heading);
      heading.append(label,view);
    }
  }

  function ensureAccessionHelp(){
    const collection=root.querySelector('[data-screen="collection"]');
    if(!collection||collection.querySelector('.accession-help')) return;
    const tools=collection.querySelector('.archive-tools');
    const help=document.createElement('div');
    help.className='accession-help';
    help.innerHTML='<b>About accession numbers</b><p>Each color keeps its own permanent sequence. <strong>LM.CLEAR.005</strong> is the fifth clear/white specimen in your archive; <strong>LM.GREEN.001</strong> is your first green. Numbers are never reused after deletion.</p>';
    tools.before(help);
  }

  function renderHomeArchive(){
    const home=root.querySelector('[data-screen="home"]');
    if(!home) return;
    ensureArchiveNavigation();

    const metricValues=[...home.querySelectorAll('.metrics .metric b')];
    const uniqueColors=new Set(savedSpecimens.map(d=>inferColorId(d)).filter(v=>v&&v!=='unclassified'));
    const uniqueBeaches=new Set(savedSpecimens.map(specimenBeach).filter(Boolean));
    if(metricValues[0]) metricValues[0].textContent=String(savedSpecimens.length).padStart(2,'0');
    if(metricValues[1]) metricValues[1].textContent=String(uniqueColors.size).padStart(2,'0');
    if(metricValues[2]) metricValues[2].textContent=String(uniqueBeaches.size).padStart(2,'0');

    const label=home.querySelector('.section-label');
    const strip=home.querySelector('.find-strip');
    if(!strip) return;
    strip.innerHTML='';

    if(!savedSpecimens.length){
      if(label) label.textContent='Recent accessions · none yet';
      const card=document.createElement('div');
      card.className='find-card empty-accession';
      const stone=document.createElement('div');
      stone.className='stone clear';
      const title=document.createElement('b');
      title.textContent='Your archive starts here';
      const small=document.createElement('small');
      small.textContent='Identify a find, then save it';
      card.append(stone,title,small);
      strip.appendChild(card);
      return;
    }

    if(label) label.textContent='Recent accessions';
    savedSpecimens.slice(0,3).forEach(d=>{
      const card=document.createElement('div');
      card.className='find-card';
      const stone=document.createElement('div');
      stone.className='stone';
      stone.style.background=`linear-gradient(145deg,rgba(255,255,255,.55),${d.color||'#c8d8d4'} 68%,${d.color||'#c8d8d4'})`;
      const title=document.createElement('b');
      title.textContent=d.name||'Saved specimen';
      const small=document.createElement('small');
      small.textContent=d.id||'Lakeglass specimen';
      card.append(stone,title,small);
      strip.appendChild(card);
    });
  }

  let activeDetailIndex=null;

  function renderCollection(){
    ensureAccessionHelp();
    const grid=root.querySelector('#collectionGrid');
    grid.innerHTML='';

    if(!savedSpecimens.length){
      const empty=document.createElement('div');
      empty.className='collection-empty';
      const title=document.createElement('b');
      title.textContent='No specimens saved yet.';
      const copy=document.createElement('p');
      copy.textContent='Identify a piece of lake glass and save the field reading to begin your personal archive.';
      empty.append(title,copy);
      grid.appendChild(empty);
    }else{
      savedSpecimens.forEach((d,index)=>{
        const card=document.createElement('article');
        card.className='spec-card';
        card.tabIndex=0;
        card.dataset.spec=String(index);

        const id=document.createElement('div');
        id.className='spec-id';
        id.textContent=`${d.id||'Lakeglass specimen'} · ${specimenBeach(d)||'Location not recorded'}`;

        const stone=document.createElement('div');
        stone.className='stone';
        stone.style.background=`linear-gradient(145deg,rgba(255,255,255,.55),${d.color||'#c8d8d4'} 68%,${d.color||'#c8d8d4'})`;

        const title=document.createElement('h3');
        title.textContent=d.name||'Saved specimen';

        const copy=document.createElement('p');
        copy.textContent=`${d.source||'Unresolved'} · ${(d.period||'Undetermined').toLowerCase()}`;

        card.append(id,stone,title,copy);
        card.addEventListener('click',()=>openDetail(index));
        card.addEventListener('keydown',e=>{
          if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(index);}
        });
        grid.appendChild(card);
      });
    }

    root.querySelector('#collectionCount').textContent=`${savedSpecimens.length} ${savedSpecimens.length===1?'specimen':'specimens'}`;
    renderHomeArchive();
  }

  function openDetail(index){
    const d=savedSpecimens[index];
    if(!d) return;
    activeDetailIndex=index;
    root.querySelector('#editSheet').classList.remove('active');
    root.querySelector('#detailId').textContent=d.id;
    root.querySelector('#detailName').textContent=d.name;
    root.querySelector('#detailProvenance').textContent=d.provenance;
    root.querySelector('#detailPeriod').textContent=d.period;
    root.querySelector('#detailRarity').textContent=d.rarity;
    root.querySelector('#detailSource').textContent=d.source;
    root.querySelector('#detailNotes').textContent=d.notes;
    show('detail');
  }

  function populateEditForm(){
    const d=savedSpecimens[activeDetailIndex];
    if(!d) return;
    root.querySelector('#editName').value=d.name||'';
    root.querySelector('#editProvenance').value=d.provenance||'';
    root.querySelector('#editPeriod').value=d.period||'';
    root.querySelector('#editSource').value=d.source||'';
    root.querySelector('#editRarity').value=d.rarity||'';
    root.querySelector('#editNotes').value=d.notes||'';
  }

  root.querySelector('#editSpecimenBtn').addEventListener('click',()=>{
    if(activeDetailIndex===null) return;
    populateEditForm();
    root.querySelector('#editSheet').classList.add('active');
  });

  root.querySelector('#cancelEditBtn').addEventListener('click',()=>root.querySelector('#editSheet').classList.remove('active'));

  root.querySelector('#saveEditBtn').addEventListener('click',()=>{
    const d=savedSpecimens[activeDetailIndex];
    if(!d) return;
    d.name=root.querySelector('#editName').value.trim()||d.name;
    d.provenance=root.querySelector('#editProvenance').value.trim()||'Not recorded';
    d.period=root.querySelector('#editPeriod').value.trim()||'Undetermined';
    d.source=root.querySelector('#editSource').value.trim()||'Unresolved';
    d.rarity=root.querySelector('#editRarity').value.trim()||d.rarity;
    d.notes=root.querySelector('#editNotes').value.trim()||'No identification notes recorded.';
    persistSavedSpecimens();
    renderCollection();
    openDetail(activeDetailIndex);
  });

  root.querySelector('#deleteSpecimenBtn').addEventListener('click',()=>{
    if(activeDetailIndex===null||!savedSpecimens[activeDetailIndex]) return;
    const d=savedSpecimens[activeDetailIndex];
    if(!window.confirm(`Delete ${d.id} from your collection? Its accession number will not be reused.`)) return;
    savedSpecimens.splice(activeDetailIndex,1);
    activeDetailIndex=null;
    persistSavedSpecimens();
    renderCollection();
    show('collection');
  });

  root.querySelector('#exportCollectionBtn').addEventListener('click',()=>{
    const payload={app:'Lakeglass',version:3,accessionSystem:'per-color',exportedAt:new Date().toISOString(),specimens:savedSpecimens};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='lakeglass-collection.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  });

  const importInput=root.querySelector('#importCollectionFile');
  root.querySelector('#importCollectionBtn').addEventListener('click',()=>importInput.click());
  importInput.addEventListener('change',()=>{
    const file=importInput.files&&importInput.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.addEventListener('load',()=>{
      try{
        const parsed=JSON.parse(String(reader.result||''));
        const rows=Array.isArray(parsed)?parsed:parsed.specimens;
        if(!Array.isArray(rows)) throw new Error('Invalid archive');
        const raw=rows.slice(0,500).filter(d=>d&&typeof d==='object').map((d,i)=>({
          key:String(d.key||`imported-${Date.now()}-${i}`),
          id:String(d.id||'').slice(0,80),
          accessionColor:String(d.accessionColor||d.colorId||'').slice(0,40),
          accessionNumber:Number(d.accessionNumber)||null,
          name:String(d.name||'Imported specimen').slice(0,120),
          color:String(d.color||'#8cc9c5').slice(0,40),
          provenance:String(d.provenance||'Not recorded').slice(0,220),
          period:String(d.period||'Undetermined').slice(0,160),
          rarity:String(d.rarity||'Not recorded').slice(0,80),
          source:String(d.source||'Unresolved').slice(0,160),
          notes:String(d.notes||'No identification notes recorded.').slice(0,1200)
        }));
        const normalized=normalizeAccessionRows(raw);
        savedSpecimens.splice(0,savedSpecimens.length,...normalized);
        persistSavedSpecimens();
        renderCollection();
        show('collection');
      }catch(err){
        window.alert('That file is not a valid Lakeglass collection export.');
      }
      importInput.value='';
    });
    reader.readAsText(file);
  });

  root.querySelector('#saveSpecimenBtn').addEventListener('click',()=>{
    const color=GLASS_COLORS.find(c=>c.id===state.color)||GLASS_COLORS[2];
    const region=REGIONS[state.region]||REGIONS.unsure;
    const reading=evaluateSpecimen(color);
    const place=root.querySelector('#foundAt').value.trim();
    const date=root.querySelector('#foundDate').value;
    const note=root.querySelector('#collectorNote').value.trim();
    const provenance=place?`${place} · ${region.label}`:region.label;
    const detailNotes=[
      reading.evidence.slice(0,3).join(' '),
      note?`Collector note: ${note}`:'',
      date?`Found ${new Date(date+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}.`:''
    ].filter(Boolean).join(' ');
    const accession=nextAccession(color.id);
    currentSpecimenCode=accession.id;

    savedSpecimens.unshift({
      key:`saved-${Date.now()}`,
      id:accession.id,
      accessionColor:color.id,
      accessionNumber:accession.number,
      name:color.name,
      color:color.hex,
      provenance,
      period:periodReading(),
      rarity:`${color.rarity} / 10`,
      source:reading.label,
      notes:detailNotes||'Saved from a Lakeglass field reading.'
    });

    persistSavedSpecimens();
    renderCollection();
    show('collection');
  });

  renderCollection();
  restoreSavedSpecimens();
})();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
