(()=>{
  const root=document.getElementById('lake-glass-mockup');
  if(!root||!window.LAKEGLASS_DATA) return;

  const {GLASS_COLORS,REGIONS}=window.LAKEGLASS_DATA;
  const LOGIC_VERSION='2026.08.26.1';
  const ARCHIVE_DB='lakeglass-archive';
  const ARCHIVE_STORE='collection';
  const LEGACY_DEMO_IDS=new Set(['LM-042','LM-041','LM-040','LM-039']);
  const ACCESSION_CODES={
    white:'CLEAR',brown:'AMBER',aqua:'AQUA',seafoam:'SEAFOAM',green:'GREEN',olive:'OLIVE',lime:'LIME',
    cobalt:'COBALT',darkaqua:'DARKAQUA',teal:'TEAL',milkglass:'MILK',lavender:'LAVENDER',pink:'PINK',
    purple:'PURPLE',gray:'GRAY',yellow:'YELLOW',opalescent:'OPALESCENT',canary:'CANARY',black:'BLACK',
    red:'RED',orange:'ORANGE',slag:'SLAG',unclassified:'UNC'
  };

  const state={
    region:'chicago',color:'aqua',thickness:'thin',form:'flat',opacity:'transparent',mark:'smooth',
    diagnosticKey:null,diagnostic:null,diagnosticText:'',datingAnswer:null
  };
  const savedSpecimens=[];
  const accessionCounters={};
  const archiveMeta={schemaVersion:5,revision:0,lastExportAt:null,lastExportCount:0,lastExportRevision:0};
  let currentReading=null;
  let activeDetailId=null;
  let reanalysisId=null;

  const screens=[...root.querySelectorAll('.screen')];
  const navButtons=[...root.querySelectorAll('.nav button')];

  function show(name){
    screens.forEach(s=>s.classList.toggle('active',s.dataset.screen===name));
    navButtons.forEach(b=>b.classList.toggle('active',b.dataset.go===name));
    if(name==='collection') renderCollection();
    window.scrollTo({top:0,behavior:'instant'});
  }

  root.addEventListener('click',event=>{
    const go=event.target.closest('[data-go]');
    if(go){
      if(go.closest('.hero-find')&&go.dataset.go==='identify') resetIdentification();
      show(go.dataset.go);
    }
  });

  const specimenMetric=root.querySelector('#specimenMetric');
  specimenMetric?.addEventListener('click',()=>show('collection'));
  specimenMetric?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show('collection');}});

  function colorById(id){return GLASS_COLORS.find(c=>c.id===id)||GLASS_COLORS.find(c=>c.id==='aqua')||GLASS_COLORS[0];}
  function regionById(id){return REGIONS[id]||REGIONS.unsure;}
  function accessionCodeFor(colorId){return ACCESSION_CODES[colorId]||'UNC';}

  function initColorChoices(){
    const wrap=root.querySelector('#colorChoices');
    wrap.innerHTML='';
    GLASS_COLORS.forEach(c=>{
      const btn=document.createElement('button');
      btn.className='swatch'+(c.id===state.color?' selected':'');
      btn.type='button';
      btn.dataset.value=c.id;
      btn.innerHTML=`<span class="swatch-dot" style="background:${c.hex}"></span><span>${c.name}</span>`;
      btn.addEventListener('click',()=>{
        state.color=c.id;
        wrap.querySelectorAll('.swatch').forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
        state.diagnostic=null;state.diagnosticKey=null;state.diagnosticText='';state.datingAnswer=null;
        renderDynamicQuestions();
      });
      wrap.appendChild(btn);
    });
  }

  root.querySelectorAll('[data-group]').forEach(group=>{
    group.querySelectorAll('.choice').forEach(btn=>btn.addEventListener('click',()=>{
      group.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected');
      state[group.dataset.group]=btn.dataset.value;
      if(group.dataset.group==='form'||group.dataset.group==='mark'){
        state.diagnostic=null;state.diagnosticKey=null;state.diagnosticText='';
      }
      renderDynamicQuestions();
    }));
  });

  function resetIdentification(){
    Object.assign(state,{region:'chicago',color:'aqua',thickness:'thin',form:'flat',opacity:'transparent',mark:'smooth',diagnosticKey:null,diagnostic:null,diagnosticText:'',datingAnswer:null});
    reanalysisId=null;
    currentReading=null;
    root.querySelector('#identifyEyebrow').textContent='Field identification';
    root.querySelector('#identifyQuestion').textContent='Tell us what the lake gave you.';
    root.querySelector('#analyzeBtn').textContent='Analyze specimen →';
    root.querySelector('#saveSpecimenBtn').textContent='Save to collection →';
    root.querySelector('#foundAt').value='';
    root.querySelector('#foundDate').value='';
    root.querySelector('#collectorNote').value='';
    setChoice('region','chicago');setChoice('thickness','thin');setChoice('form','flat');setChoice('opacity','transparent');setChoice('mark','smooth');
    initColorChoices();
    renderDynamicQuestions();
  }

  function setChoice(group,value){
    const wrap=root.querySelector(`[data-group="${group}"]`);
    if(!wrap) return;
    wrap.querySelectorAll('.choice').forEach(x=>x.classList.toggle('selected',x.dataset.value===value));
    state[group]=value||null;
  }

  function selectColor(id){
    state.color=id||'aqua';
    root.querySelectorAll('#colorChoices .swatch').forEach(x=>x.classList.toggle('selected',x.dataset.value===state.color));
  }

  function diagnosticConfig(){
    if(state.mark==='letters') return {
      key:'embossing',
      question:'What can you actually make out in the mark?',
      help:'Choose what you can physically see. You can transcribe the surviving mark after selecting a type.',
      options:[
        ['letters','Letters or part of a word','Raised or indented alphabetic characters, even if only one or two survive.'],
        ['numbers','Numbers or a date code','Digits by themselves or grouped with letters; these can be mold, plant, capacity, or date codes.'],
        ['symbol','Logo or picture-like symbol','An emblem, monogram, geometric logo, crest, or other non-letter symbol.'],
        ['maker','Small maker’s mark or base code','A compact manufacturer symbol, plant code, or code usually found on a bottle base or heel.'],
        ['unclear','Too little survives to tell','Only a partial bump, stroke, or fragment of a mark remains.']
      ]
    };
    if(state.mark==='vents') return {
      key:'vents',
      question:'How many tiny mold vent dots can you see?',
      help:'Vent marks are tiny round dots made by the bottle mold—not trapped air bubbles inside the glass.',
      options:[
        ['single','Only one pair or a few tiny vent dots','A very small number of round mold dots in one or two places.'],
        ['multiple','Many vent dots around the body or lettering','Repeated tiny round dots distributed around embossing or other parts of the bottle.'],
        ['unclear','Not enough survives to tell','The marks are too worn, partial, or ambiguous to count confidently.']
      ]
    };
    if(state.form==='rim'||state.form==='neck') return {
      key:'finish',
      question:'If this is part of the bottle or jar opening, what does the lip look like?',
      help:'Look only at the top opening where a cap, cork, or closure attached. If too little of the opening survives, choose the last option.',
      options:[
        ['applied','Extra ring of glass added around the lip (applied finish)','The lip looks like a separate collar or band of glass was added onto the neck.'],
        ['tooled','Smooth hand-shaped lip; mold seam stops below it (tooled finish)','The lip is smoothed or shaped, but the vertical mold seam does not continue through the very top.'],
        ['seamthrough','Vertical mold seam runs all the way through the lip','A seam line continues up the neck and across/through the top finish—a strong machine-made clue.'],
        ['crown','Rounded lip for a pry-off metal bottle cap (crown finish)','Looks like a soda/beer bottle mouth: a rounded top with a bead or ring that a crimped metal cap grabbed.'],
        ['screw','Raised spiral threads for a twist-on cap (screw-thread finish)','You can see helical/spiral ridges around the neck or mouth where a cap would screw on.'],
        ['unclear','Not enough of the bottle opening survives','The shard includes only part of the neck/lip, or weathering makes the closure type uncertain.']
      ]
    };
    if(state.form==='base') return {
      key:'base',
      question:'What physical feature can you see on the bottle or jar base?',
      help:'Look for scars, seams, rings, raised marks, or texture. These are often much more useful for dating than color alone.',
      options:[
        ['pontil','Rough or polished scar near the center (pontil scar)','An irregular rough patch, circular scar, or polished spot where a pontil rod was attached during hand finishing.'],
        ['owens','Curved feathered or suction-like scar (Owens scar)','A curved circular/oval scar—often sweeping or feathered and sometimes off-center—from the Owens automatic bottle process.'],
        ['seamedge','Mold seam visible within the outer edge of the base','A molded seam line reaches into the base/heel area rather than the base being completely smooth.'],
        ['machine','Regular concentric rings or other neat machine marks','Repeated circular rings, valve-like marks, or other regular features consistent with machine manufacture.'],
        ['embossed','Raised letters, numbers, or logo on the base','Embossed maker, plant, mold, capacity, or date information.'],
        ['stipple','Dense field of tiny raised dots (stippled base)','Many evenly spaced little bumps or dots covering part of the base surface.'],
        ['plain','Base looks smooth with no obvious feature','No scar, raised mark, stippling, or useful seam is visible.'],
        ['unclear','Not enough of the base survives','The base is too incomplete or worn to classify confidently.']
      ]
    };
    if(state.color==='lavender') return {
      key:'manganese',
      question:'What does the lavender color actually look like?',
      help:'This helps separate possible sun-purpled manganese-decolorized clear glass from glass that was intentionally made purple.',
      options:[
        ['solarized','Pale, faint, or uneven lavender cast','The purple looks subtle or patchy, as if clear glass picked up an amethyst tint.'],
        ['deep','Deep, even purple throughout the shard','The color is strong and uniform through the glass rather than a faint surface/edge cast.'],
        ['unclear','Hard to tell','Lighting, thickness, or weathering makes the color pattern uncertain.']
      ]
    };
    if(state.color==='black') return {
      key:'backlight',
      question:'Hold it to a very bright light. What color glows through?',
      help:'Most “black” bottle glass is actually extremely dark olive, amber, blue, or purple glass.',
      options:[
        ['olive','Olive or green shows through','Thin edges or the center glow deep green/olive under strong backlight.'],
        ['brown','Brown or amber shows through','Thin edges or the center glow amber/brown under strong backlight.'],
        ['bluepurple','Blue or purple shows through','A deep blue, cobalt, violet, or purple undertone appears.'],
        ['black','It still looks black even at a thin edge','No underlying color is obvious even under strong light.'],
        ['unclear','Could not tell','The shard is too thick, light is insufficient, or the result is ambiguous.']
      ]
    };
    if(state.color==='milkglass') return {
      key:'milk',
      question:'When you hold it to a bright light, how much light passes through?',
      help:'True milk glass is opaque or softly translucent; heavily frosted clear glass can look white on the beach.',
      options:[
        ['opaque','No light passes through','The shard stays solid white/opaque even against a bright light.'],
        ['soft','Only a diffuse glow passes through','Light softens through the shard, but you cannot see clearly through it.'],
        ['clear','Light passes clearly through','This may be heavily frosted clear glass rather than true milk glass.'],
        ['unclear','Hard to tell','Thickness or lighting makes the opacity uncertain.']
      ]
    };
    if(state.color==='slag') return {
      key:'slag',
      question:'Does the piece look like part of a vessel, or more like an irregular glassy rock?',
      help:'Industrial slag often has inclusions, bubbles, swirls, or irregular rock-like mass instead of a bottle/jar wall.',
      options:[
        ['stone','Irregular rock-like piece with inclusions','The shape is lumpy or stone-like and may contain bubbles, grit, streaks, or other inclusions.'],
        ['glassy','Smooth glassy lump with no clear vessel shape','It looks melted or glassy but does not preserve a regular bottle, jar, plate, or window geometry.'],
        ['vessel','Clearly part of a bottle, jar, or other vessel','Regular curvature, flat wall geometry, rim, base, or another manufactured vessel form survives.'],
        ['unclear','Hard to tell','Weathering or fragmentation makes the original form uncertain.']
      ]
    };
    return null;
  }

  const DATING_QUESTIONS={
    white:{question:'Against white paper in daylight, does the clear glass have a faint tint?',help:'Subtle decolorizer tints can carry more dating value than “clear” alone.',options:[['amethyst','Faint lavender / amethyst'],['straw','Faint straw / honey'],['gray','Faint gray'],['colorless','No obvious tint'],['unclear','Hard to tell']]},
    yellow:{question:'Is the yellow only a faint straw tint in otherwise clear glass?',help:'A straw cast can reflect selenium/arsenic decolorization rather than intentionally yellow glass.',options:[['straw','Mostly clear with straw tint'],['trueyellow','Distinctly yellow glass'],['unclear','Hard to tell']]},
    gray:{question:'Is this essentially colorless glass with only a faint gray cast?',help:'A subtle gray tint in otherwise colorless bottle glass has limited chronological value.',options:[['tint','Faint gray tint'],['truegray','Clearly gray glass'],['unclear','Hard to tell']]},
    canary:{question:'If you have a UV light, does it fluoresce vivid green?',help:'Strong green fluorescence supports uranium-colored glass. Not tested is fine.',options:[['uvyes','Yes · vivid green'],['uvno','No fluorescence'],['untested','Not tested']]}
  };

  function renderDynamicQuestions(){renderDiagnostic();renderDatingQuestion();}

  function renderDiagnostic(){
    const group=root.querySelector('#diagnosticGroup');
    const config=diagnosticConfig();
    if(!config){group.hidden=true;state.diagnosticKey=null;state.diagnostic=null;state.diagnosticText='';root.querySelector('#diagnosticTextInput').hidden=true;return;}
    if(state.diagnosticKey!==config.key){state.diagnosticKey=config.key;state.diagnostic=null;state.diagnosticText='';}
    group.hidden=false;
    root.querySelector('#diagnosticQuestion').textContent=config.question;
    root.querySelector('#diagnosticHelp').textContent=config.help;
    const choices=root.querySelector('#diagnosticChoices');
    choices.innerHTML='';
    config.options.forEach(([value,label,description])=>{
      const btn=document.createElement('button');btn.type='button';btn.className='choice'+(state.diagnostic===value?' selected':'');btn.dataset.value=value;btn.innerHTML=description?`${label}<small>${description}</small>`:label;
      btn.addEventListener('click',()=>{state.diagnostic=value;choices.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');updateDiagnosticTextVisibility();});
      choices.appendChild(btn);
    });
    const input=root.querySelector('#diagnosticTextInput');
    input.value=state.diagnosticText||'';
    input.oninput=()=>{state.diagnosticText=input.value.trim();};
    updateDiagnosticTextVisibility();
  }

  function updateDiagnosticTextVisibility(){
    const input=root.querySelector('#diagnosticTextInput');
    const wantsText=state.diagnosticKey==='embossing'&&state.diagnostic&&state.diagnostic!=='unclear';
    input.hidden=!wantsText;
  }

  function renderDatingQuestion(){
    const group=root.querySelector('#datingClueGroup');
    const config=DATING_QUESTIONS[state.color];
    if(!config){group.hidden=true;state.datingAnswer=null;return;}
    group.hidden=false;
    root.querySelector('#datingQuestion').textContent=config.question;
    root.querySelector('#datingHelp').textContent=config.help;
    const choices=root.querySelector('#datingChoices');choices.innerHTML='';
    config.options.forEach(([value,label,description])=>{
      const btn=document.createElement('button');btn.type='button';btn.className='choice'+(state.datingAnswer===value?' selected':'');btn.dataset.value=value;btn.innerHTML=description?`${label}<small>${description}</small>`:label;
      btn.addEventListener('click',()=>{state.datingAnswer=value;choices.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');});
      choices.appendChild(btn);
    });
  }

  function inferColorId(d){
    const requested=String(d?.accessionColor||d?.observations?.colorId||d?.colorId||'');
    if(GLASS_COLORS.some(c=>c.id===requested)) return requested;
    const hex=String(d?.color||'').toLowerCase();
    const byHex=GLASS_COLORS.find(c=>String(c.hex||'').toLowerCase()===hex);if(byHex) return byHex.id;
    const name=String(d?.name||'').toLowerCase();
    if(name.includes('clear')||name.includes('white')) return 'white';if(name.includes('amber')||name.includes('brown')) return 'brown';if(name.includes('aqua')) return 'aqua';if(name.includes('green')) return 'green';if(name.includes('lavender')||name.includes('amethyst')) return 'lavender';
    return 'unclassified';
  }

  function accessionNumberFromId(id,colorId){
    const match=String(id||'').match(/^LM\.([A-Z0-9]+)\.(\d+)$/);if(!match||match[1]!==accessionCodeFor(colorId)) return null;
    const n=Number(match[2]);return Number.isInteger(n)&&n>0?n:null;
  }

  function legacyRegionFromProvenance(text){
    const p=String(text||'').toLowerCase();if(p.includes('chicago')) return 'chicago';if(p.includes('milwaukee')) return 'milwaukee';if(p.includes('michigan')) return 'michigan';return 'unsure';
  }

  function legacyFoundAt(text){
    const first=String(text||'').split(' · ')[0].trim();
    if(!first||['Not recorded','Chicago area','Milwaukee area','Michigan shoreline','Lake Michigan','General Lake Michigan'].includes(first)) return '';
    return first;
  }

  function numberFromRarity(value,colorId){
    const n=Number(String(value||'').match(/\d+/)?.[0]);return Number.isFinite(n)&&n>0?n:colorById(colorId).rarity;
  }

  function confidenceFromLegacyPeriod(period){
    const p=String(period||'').toLowerCase();if(p.includes('pontil')||p.includes('owens')||p.includes('diagnostic')) return 'Diagnostic';if(p.match(/\d{4}.*\d{4}/)) return 'Moderate';return 'Broad';
  }

  function timestampFromKey(key){const m=String(key||'').match(/(\d{12,})/);return m?new Date(Number(m[1])).toISOString():null;}

  function normalizeRecord(raw){
    const d={...raw};
    const colorId=inferColorId(d);
    const existingObs=d.observations&&typeof d.observations==='object'?{...d.observations}:null;
    const observations=existingObs||{
      schema:2,legacy:true,colorId,regionId:legacyRegionFromProvenance(d.provenance),thickness:null,form:null,opacity:null,mark:null,
      diagnosticKey:null,diagnostic:null,diagnosticText:'',datingAnswer:null,foundAt:legacyFoundAt(d.provenance),foundDate:null,collectorNote:''
    };
    observations.schema=2;observations.colorId=observations.colorId||colorId;observations.regionId=observations.regionId||legacyRegionFromProvenance(d.provenance);
    if(existingObs&&!('legacy' in observations)) observations.legacy=false;

    const interpretation=d.interpretation&&typeof d.interpretation==='object'?{...d.interpretation}:{
      logicVersion:'legacy',analyzedAt:d.lastAnalyzedAt||d.accessionedAt||timestampFromKey(d.key),source:d.source||'Unresolved',period:d.period||'Broad date only',
      datingConfidence:confidenceFromLegacyPeriod(d.period),colorRarity:numberFromRarity(d.rarity,colorId),formDistinctiveness:null,historyInterest:null,strength:'Legacy reading',
      evidence:d.notes?[String(d.notes)]:[],cautions:[],datingBasis:'Migrated from an earlier Lakeglass accession; the original physical selections were not stored separately.'
    };
    interpretation.logicVersion=interpretation.logicVersion||'legacy';
    interpretation.colorRarity=Number(interpretation.colorRarity)||numberFromRarity(d.rarity,colorId);

    return {
      ...d,
      key:String(d.key||`saved-${Date.now()}-${Math.random().toString(36).slice(2,7)}`),
      accessionColor:d.accessionColor||colorId,
      observations,
      interpretation,
      interpretationHistory:Array.isArray(d.interpretationHistory)?d.interpretationHistory:[],
      accessionedAt:d.accessionedAt||timestampFromKey(d.key)||null,
      lastAnalyzedAt:d.lastAnalyzedAt||interpretation.analyzedAt||null,
      name:d.name||colorById(observations.colorId).name,
      color:d.color||colorById(observations.colorId).hex,
      provenance:d.provenance||provenanceText(observations),
      period:interpretation.period||d.period||'Broad date only',
      rarity:`${interpretation.colorRarity} / 10`,
      source:interpretation.source||d.source||'Unresolved',
      notes:d.notes||interpretation.evidence?.join(' ')||'No interpretation notes recorded.'
    };
  }

  function normalizeRows(rows){
    const clean=(Array.isArray(rows)?rows:[]).filter(d=>d&&typeof d==='object'&&!LEGACY_DEMO_IDS.has(String(d.id||''))).map(normalizeRecord);
    const maxima={};const used={};
    clean.forEach(d=>{
      const c=d.accessionColor||inferColorId(d);d.accessionColor=c;
      const n=Number(d.accessionNumber)||accessionNumberFromId(d.id,c);
      if(n&&(!used[c]||!used[c].has(n))){if(!used[c]) used[c]=new Set();used[c].add(n);d.accessionNumber=n;d.id=`LM.${accessionCodeFor(c)}.${String(n).padStart(3,'0')}`;maxima[c]=Math.max(maxima[c]||0,n);}else d.accessionNumber=null;
    });
    [...clean].reverse().forEach(d=>{if(d.accessionNumber)return;const c=d.accessionColor||'unclassified';const n=(maxima[c]||0)+1;maxima[c]=n;d.accessionNumber=n;d.id=`LM.${accessionCodeFor(c)}.${String(n).padStart(3,'0')}`;});
    return clean;
  }

  function mergeCounters(){
    savedSpecimens.forEach(d=>{const c=d.accessionColor||inferColorId(d);const n=Number(d.accessionNumber)||accessionNumberFromId(d.id,c)||0;if(n>0) accessionCounters[c]=Math.max(Number(accessionCounters[c])||0,n);});
  }

  function nextAccession(colorId){
    let max=Number(accessionCounters[colorId])||0;savedSpecimens.forEach(d=>{if(d.accessionColor!==colorId)return;max=Math.max(max,Number(d.accessionNumber)||0);});
    const number=max+1;return {number,id:`LM.${accessionCodeFor(colorId)}.${String(number).padStart(3,'0')}`};
  }

  function openArchiveDb(){
    return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){resolve(null);return;}const req=indexedDB.open(ARCHIVE_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(ARCHIVE_STORE)) req.result.createObjectStore(ARCHIVE_STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  }

  async function persistArchive(){
    try{const db=await openArchiveDb();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction(ARCHIVE_STORE,'readwrite');const store=tx.objectStore(ARCHIVE_STORE);store.put(savedSpecimens,'specimens');store.put({...accessionCounters},'accessionCounters');store.put({...archiveMeta},'archiveMeta');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(err){}
  }

  function markArchiveChanged(){archiveMeta.revision=(Number(archiveMeta.revision)||0)+1;archiveMeta.schemaVersion=5;}

  async function restoreArchive(){
    try{
      const db=await openArchiveDb();if(!db){renderAll();return;}
      const restored=await new Promise((resolve,reject)=>{const tx=db.transaction(ARCHIVE_STORE,'readonly');const store=tx.objectStore(ARCHIVE_STORE);const a=store.get('specimens'),b=store.get('accessionCounters'),c=store.get('archiveMeta');tx.oncomplete=()=>resolve({rows:a.result,counters:b.result,meta:c.result});tx.onerror=()=>reject(tx.error);});db.close();
      savedSpecimens.splice(0,savedSpecimens.length,...normalizeRows(restored.rows));
      Object.keys(accessionCounters).forEach(k=>delete accessionCounters[k]);
      if(restored.counters&&typeof restored.counters==='object') Object.entries(restored.counters).forEach(([k,v])=>{const n=Number(v);if(Number.isInteger(n)&&n>0) accessionCounters[k]=n;});
      mergeCounters();
      if(restored.meta&&typeof restored.meta==='object') Object.assign(archiveMeta,restored.meta,{schemaVersion:5});
      await persistArchive();renderAll();
    }catch(err){renderAll();}
  }

  function selectedObservation(){
    return {
      schema:2,legacy:false,colorId:state.color,regionId:state.region,thickness:state.thickness||null,form:state.form||null,opacity:state.opacity||null,mark:state.mark||null,
      diagnosticKey:state.diagnosticKey||null,diagnostic:state.diagnostic||null,diagnosticText:(state.diagnosticText||'').trim(),datingAnswer:state.datingAnswer||null,
      foundAt:root.querySelector('#foundAt').value.trim(),foundDate:root.querySelector('#foundDate').value||null,collectorNote:root.querySelector('#collectorNote').value.trim()
    };
  }

  function provenanceText(obs){const region=regionById(obs?.regionId).label;return obs?.foundAt?`${obs.foundAt} · ${region}`:region;}

  function shortThickness(v){return ({thin:'Thin glass fragment',medium:'Medium-weight glass',thick:'Thick / heavy glass',unknown:'Thickness unresolved'})[v]||'Not recorded';}
  function shortForm(v){return ({flat:'Small flat fragment',curved:'Clearly curved vessel wall',rim:'Rim / lip / finish',base:'Base / heel',neck:'Bottle neck',unknown:'Form unresolved'})[v]||'Not recorded';}
  function shortMark(v){return ({smooth:'Smooth and frosted',letters:'Embossed / marked',vents:'Molded vent dots',ripple:'Deliberately wavy / rippled',rough:'Sharper / glossier surface'})[v]||'Not recorded';}
  function formDistinctiveness(v){return ({flat:1,unknown:1,curved:3,rim:8,base:9,neck:8})[v]||1;}
  function rarityLabel(n){if(n<=2)return 'Very common color';if(n<=4)return 'Familiar color';if(n<=6)return 'Uncommon color';if(n<=8)return 'Rare color';if(n===9)return 'Very rare color';return 'Exceptional color';}

  function diagnosticLabel(obs){
    const labels={
      embossing:{letters:'Readable letters / word',numbers:'Numbers / date code',symbol:'Logo / symbol',maker:'Maker mark / base code',unclear:'Mark unclear'},
      vents:{single:'One simple pair / few vent marks',multiple:'Multiple vent marks',unclear:'Vent pattern unclear'},
      finish:{applied:'Added glass ring at lip (applied finish)',tooled:'Smooth hand-shaped lip (tooled finish)',seamthrough:'Mold seam runs through lip (machine-made)',crown:'Pry-off cap lip (crown finish)',screw:'Twist-on cap threads (screw-thread finish)',unclear:'Bottle opening / finish unclear'},
      base:{pontil:'Center attachment scar (pontil scar)',owens:'Curved suction scar (Owens process)',seamedge:'Mold seam visible at outer base edge',machine:'Regular rings / machine-made base feature',embossed:'Raised maker / plant / date mark',stipple:'Field of tiny raised dots (stippled base)',plain:'Smooth base with no obvious feature',unclear:'Base feature unclear'},
      manganese:{solarized:'Pale / uneven solarized lavender',deep:'Deep even purple',unclear:'Lavender origin unclear'},
      backlight:{olive:'Backlights olive / green',brown:'Backlights brown / amber',bluepurple:'Backlights blue / purple',black:'Still appears black',unclear:'Backlit color unclear'},
      milk:{opaque:'Confirmed opaque milk glass',soft:'Soft glow only',clear:'Transmits clear light',unclear:'Opacity clue unclear'},
      slag:{stone:'Stone-like with inclusions',glassy:'Smooth glassy mass',vessel:'Vessel-like curvature',unclear:'Texture unclear'}
    };
    let text=obs?.diagnosticKey&&obs?.diagnostic?labels[obs.diagnosticKey]?.[obs.diagnostic]:'No diagnostic feature recorded';
    if(obs?.diagnosticText) text=`${text} · “${obs.diagnosticText}”`;
    return text||'No diagnostic feature recorded';
  }

  function estimatePeriod(obs){
    const color=obs.colorId;const key=obs.diagnosticKey;const d=obs.diagnostic;const chem=obs.datingAnswer;const place=String(obs.foundAt||'').toLowerCase();
    const r=(text,confidence,historyInterest,basis)=>({text,confidence,historyInterest,basis});

    if(key==='base'&&d==='pontil') return r('Usually pre-1870s · utilitarian bottles often pre-1865','Diagnostic',10,'A pontil scar is a strong mid-19th-century-or-earlier manufacturing clue on utilitarian bottles.');
    if(key==='finish'&&d==='applied') return r('Applied finish · typically ca. 1820–1890','Diagnostic',10,'Applied-finish bottles typically date from about 1820 to 1890.');
    if(key==='finish'&&d==='tooled') return r('Tooled finish · usually ca. 1880s–early 1920s','Strong',9,'Tooled finishes became dominant after about 1890 and largely disappeared during the 1910s to early 1920s.');
    if(key==='base'&&d==='seamedge') return r('Usually no later than ca. 1890–1895','Strong',9,'Mold seams within the extreme outside base edges generally favor pre-1895 mouth-blown manufacture.');
    if(key==='vents'&&d==='single') return r('Air-vented mouth-blown glass · often ca. 1885–1895','Strong',8,'Simple early air-vent patterns generally begin in the mid/late 1880s and become common by about 1890.');
    if(key==='vents'&&d==='multiple') return r('Multiple air vents · often ca. 1905–1920','Strong',9,'Multiple vent marks integrated around the bottle or embossing tend to favor later mouth-blown production.');
    if(key==='finish'&&d==='seamthrough') return r('Machine-made · usually 20th century, increasingly common after 1905','Strong',9,'A mold seam continuing through the finish strongly supports machine manufacture.');
    if(key==='base'&&d==='owens') return r('Owens automatic-bottle process · 1905 onward; early 20th century strongly favored','Diagnostic',10,'The feathered Owens suction scar is unique to the Owens automatic-bottle process, introduced commercially in the early 20th century.');
    if(key==='base'&&d==='machine') return r('Machine-made · generally post-1905; most likely after the mid-1910s','Strong',9,'Machine-made base features strongly favor 20th-century automatic production.');
    if(key==='finish'&&d==='crown') return r('Crown finish · post-1892; early applied examples ca. 1895–1910','Strong',8,'The crown closure was patented in 1892; early applied crown finishes are documented around 1895–1910.');
    if(key==='finish'&&d==='screw') return r('Screw-thread finish · broad 20th-century tendency; closure type needed for precision','Moderate',6,'Threaded finishes span many container types and periods, so the surviving closure system matters.');
    if(key==='embossing'&&d&&d!=='unclear') return r('Maker / product mark present · exact research may narrow the date','Strong',9,'A transcription, logo, plant code, or date code can be more precise than color-based dating.');
    if(key==='base'&&d==='embossed') return r('Embossed base mark present · maker research may narrow the date','Strong',9,'Base marks can identify manufacturer, plant, mold, or date information.');

    if(color==='lavender'){
      if(key==='manganese'&&d==='solarized') return r('ca. 1890–1920 probable · some manganese examples continue into the 1930s','Strong',9,'A pale or uneven solarized amethyst cast supports manganese-decolorized colorless glass.');
      if(key==='manganese'&&d==='deep') return r('If true intentionally purple bottle glass: chiefly 1840s–early 1880s · decorative glass may be later','Moderate',7,'True purple bottle glass and solarized manganese glass have different chronologies.');
      return r('If solarized manganese glass: ca. 1890–1920 probable','Moderate',7,'Lavender is dateable only when solarization is the better explanation than intentional purple color.');
    }
    if(color==='white'){
      if(chem==='amethyst') return r('ca. 1890–1920 probable · some examples into the 1930s','Strong',9,'A faint amethyst tint supports manganese-decolorized colorless glass.');
      if(chem==='straw') return r('Usually mid-1910s or later · often ca. 1915–mid-20th century','Strong',8,'A faint straw tint is associated with later colorless glass decolorization and is unlikely much before World War I.');
      if(chem==='gray') return r('ca. 1915–1925 tendency · exceptions occur','Moderate',7,'A faint gray tint in otherwise colorless bottle glass has limited chronological value.');
      return r('Colorless glass alone · broad late-19th-century through modern range','Broad',3,'Untinted clear glass spans too many products and periods to date narrowly without manufacturing evidence.');
    }
    if(color==='yellow'){
      if(chem==='straw') return r('Usually mid-1910s or later · often ca. 1915–mid-20th century','Strong',8,'A straw cast in otherwise colorless glass can reflect later decolorization chemistry.');
      return r('True yellow glass · no reliable color-only date range','Broad',3,'Intentionally yellow glass spans multiple decorative and specialty uses.');
    }
    if(color==='gray'){
      if(chem==='tint') return r('ca. 1915–1925 tendency · exceptions occur','Moderate',7,'A subtle gray tint in otherwise colorless bottle glass has limited chronological value.');
      return r('True gray glass · date unresolved from color alone','Broad',3,'Gray specialty, leaded, tile, and decorative glass spans multiple periods.');
    }
    if(color==='canary'){
      if(chem==='uvyes') return r('If uranium-colored glass: widespread ca. 1830s–1940s','Strong',8,'Strong green fluorescence supports uranium-colored glass, widely used across this period.');
      return r('Canary / Vaseline color · UV confirmation needed for a uranium date range','Moderate',5,'Yellow-green color suggests uranium glass but fluorescence is a stronger field clue.');
    }
    if(color==='slag'){
      if(place.includes('leland')) return r('Leland iron-smelting slag · ca. 1870–1885','Diagnostic',10,'Known Leland provenance can tie industrial slag to the Leland iron furnace operating period.');
      if(place.includes('frankfort')||place.includes('elberta')) return r('Frankfort / Elberta iron-smelting slag · ca. 1870–1883','Diagnostic',10,'Known Frankfort/Elberta provenance can tie industrial slag to the local ironworks period.');
      return r('Industrial slag · local furnace attribution needed for a tighter date','Moderate',7,'Industrial slag can be highly dateable when a specific furnace/source context is defensible.');
    }
    if(color==='aqua') return r('American aqua utility glass broadly 19th to early 20th century · often pre-1930','Moderate',6,'Aqua is common in historic utility bottles and jars but still needs manufacturing clues for a narrow date.');
    if(color==='seafoam') return r('If utilitarian blue-green bottle glass: usually 19th to very early 20th century','Moderate',5,'Blue-green utility glass generally favors earlier bottle manufacture, with important object-type exceptions.');
    if(color==='darkaqua'||color==='teal') return r('If utilitarian blue-green glass: often 19th to very early 20th century · decorative / insulator glass may be later','Moderate',5,'Object type is necessary before treating blue-green color as chronological.');
    if(color==='lime') return r('Bright “7-Up” green strongly favors the 20th century','Moderate',5,'Very bright green is unusual on 19th-century bottles and becomes characteristic in the 20th century.');
    if(color==='olive') return r('Olive bottle glass favors the 19th century · wine / champagne are important later exceptions','Moderate',7,'Olive and olive-amber have useful 19th-century tendencies but are not universally early.');
    if(color==='black') return r('Historic near-black bottle glass strongly favors the 19th century · later imports / specialty glass occur','Moderate',8,'Very dark olive or amber bottle glass is strongly associated with earlier bottle traditions.');
    if(color==='purple') return r('If true purple bottle glass: chiefly mid-19th century to early 1880s · decorative glass may be later','Moderate',7,'Intentional purple bottle glass is distinct from later solarized manganese glass.');
    if(color==='milkglass') return r('Cosmetic / toiletry bottles mainly late 19th–early 20th century · jars often continue later','Moderate',7,'Milk glass is strongly tied to cosmetic, toiletry, ointment, and cream containers across these periods.');
    if(color==='opalescent') return r('Often early-20th-century decorative glass · color alone is not a firm date','Broad',4,'Opalescent glass becomes more useful when combined with form or known decorative patterns.');
    if(color==='pink') return r('Often 20th-century decorative / household glass · sun-altered manganese is another possibility','Broad',4,'Pink has multiple causes and uses, so color alone is not a defensible narrow date.');
    if(color==='cobalt') return r('Cobalt spans many bottle classes from the 19th century onward · color alone is broad','Broad',4,'Cobalt has limited dating utility without maker, product, or manufacturing evidence.');
    if(color==='brown') return r('Amber / brown spans many periods · no reliable color-only date','Broad',3,'Amber is common across beverage, medicine, bitters, and household bottles.');
    if(color==='green') return r('Green spans many periods · no reliable color-only date','Broad',3,'Most green shades have limited chronological value without form, finish, or manufacturing evidence.');
    if(color==='red'||color==='orange') return r('Rare color, but no reliable color-only manufacture date','Broad',4,'Rarity is not the same as chronological value; specialty and decorative uses span multiple periods.');
    return r('Broad date only · stronger manufacturing clue needed','Broad',2,'Color alone does not provide a defensible narrow chronology for this specimen.');
  }

  function evaluateSpecimen(obs){
    const color=colorById(obs.colorId);const scores={bottle:0,jar:0,flat:0,decorative:0,slag:0,insulator:0};const evidence=[];const cautions=[];
    const add=(type,points,reason)=>{scores[type]+=points;if(reason)evidence.push(reason);};
    if(obs.form==='curved'){add('bottle',4,'Clear vessel curvature strongly supports container glass.');add('jar',1);}
    if(obs.form==='flat') evidence.push('Small-fragment flatness is weak source evidence because breakage and tumbling can erase original curvature.');
    if(obs.form==='rim'){add('bottle',5,'A surviving rim or finish is a diagnostic vessel feature.');add('jar',2);}
    if(obs.form==='base'){add('bottle',3,'A surviving base or heel supports a vessel identification.');add('jar',3);}
    if(obs.form==='neck') add('bottle',6,'A surviving neck strongly supports a bottle.');
    if(obs.mark==='letters'){add('bottle',3,'Embossing is high-value manufacturing evidence.');add('jar',2);}
    if(obs.mark==='vents') add('bottle',2,'Molded air vents support manufactured bottle glass.');
    if(obs.mark==='ripple') add('flat',6,'Deliberate waviness is meaningful evidence for flat / plate glass.');
    if(obs.mark==='smooth') evidence.push('Even frosting and softened edges support prolonged shoreline weathering.');
    if(obs.mark==='rough') evidence.push('Remaining gloss or sharper facets suggest lighter shoreline weathering.');
    if(obs.thickness==='thin') add('bottle',1,'Thin glass is compatible with bottle-wall glass but is not diagnostic.');
    if(obs.thickness==='medium'){add('jar',2,'Medium thickness fits heavier containers or tableware.');add('bottle',1);}
    if(obs.thickness==='thick'){add('slag',2,'Heavy thickness raises industrial-material potential.');add('insulator',2,'Heavy thickness can fit utility / insulator glass.');add('bottle',1);}
    if(obs.opacity==='opaque'&&obs.colorId==='milkglass'){add('jar',5,'Confirmed opacity strongly supports true milk glass.');add('decorative',2);}
    if(obs.opacity==='opaque'&&obs.colorId==='slag') add('slag',4,'Opaque or near-opaque material supports industrial slag.');
    if(['white','brown','aqua','seafoam','green','olive','lime','darkaqua','teal'].includes(obs.colorId)) add('bottle',2,'The selected color is compatible with historic utility-container glass.');
    if(obs.colorId==='cobalt'){add('bottle',2,'Cobalt is compatible with medicine and specialty bottles.');add('decorative',2);}
    if(['pink','purple','gray','yellow','opalescent','canary','red','orange'].includes(obs.colorId)) add('decorative',3,'The color raises specialty or decorative possibilities.');
    if(obs.colorId==='teal'){add('jar',2,'Teal also occurs in utilitarian jars and containers.');add('insulator',1,'Teal occurs in historic electrical insulators.');}
    if(obs.colorId==='darkaqua') add('insulator',2,'Dark aqua can occur in historic electrical insulators.');
    if(obs.colorId==='milkglass') add('jar',3,'Milk glass commonly occurs in cosmetic, ointment, and household containers.');
    if(obs.colorId==='slag') add('slag',6,'The selected material category directly supports industrial slag.');
    if(obs.colorId==='black') add('bottle',2,'Near-black pieces are often deeply colored bottle glass.');
    if(obs.diagnosticKey==='finish'&&obs.diagnostic&&obs.diagnostic!=='unclear') add('bottle',4,'The surviving finish is strong vessel evidence.');
    if(obs.diagnosticKey==='base'&&['pontil','owens','seamedge','machine','embossed'].includes(obs.diagnostic)) add('bottle',4,'The base preserves a diagnostic manufacturing feature.');
    if(obs.diagnosticKey==='embossing'&&obs.diagnostic&&obs.diagnostic!=='unclear') add('bottle',3,'The surviving mark may support maker- or product-level identification.');
    if(obs.diagnosticKey==='manganese'&&obs.diagnostic==='solarized') add('bottle',2,'Pale solarized amethyst is compatible with originally colorless manganese-decolorized container glass.');
    if(obs.diagnosticKey==='manganese'&&obs.diagnostic==='deep') add('decorative',3,'Deep even purple may have been intentionally colored.');
    if(obs.diagnosticKey==='milk'&&obs.diagnostic==='clear') cautions.push('Clear light transmission conflicts with true milk glass and suggests heavily frosted clear glass instead.');
    if(obs.diagnosticKey==='slag'&&obs.diagnostic==='vessel') cautions.push('Vessel-like curvature conflicts with an industrial-slag identification.');
    if(obs.form==='flat'&&obs.mark!=='ripple') cautions.push('A flat, rounded beach-tumbled fragment can come from bottles, jars, tableware, or flat glass; flatness alone cannot identify window glass.');

    const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);const [top,second]=ranked;const margin=top[1]-second[1];
    let strength='Possible';if(top[1]===0) strength='Unresolved';else if(top[1]>=9&&margin>=3) strength='Distinctive match';else if(top[1]>=6&&margin>=2) strength='Strong match';else if(top[1]>=4) strength='Good match';
    const labels={bottle:'Bottle / container glass',jar:'Jar / heavier container',flat:'Flat / plate glass',decorative:'Decorative / specialty glass',slag:'Industrial slag',insulator:'Utility / insulator glass'};
    const estimate=estimatePeriod(obs);
    return {logicVersion:LOGIC_VERSION,analyzedAt:new Date().toISOString(),source:labels[top[0]]||'Unresolved',period:estimate.text,datingConfidence:estimate.confidence,colorRarity:color.rarity,formDistinctiveness:formDistinctiveness(obs.form),historyInterest:estimate.historyInterest,strength,evidence,cautions,datingBasis:estimate.basis,scoreMargin:margin};
  }

  function researchRefs(obs){
    const color=colorById(obs.colorId);const region=regionById(obs.regionId);const refs=[...(color.refs||[]),...(region.refs||[]),'Society for Historical Archaeology — Historic Glass Bottle Identification'];return refs.filter((v,i,a)=>a.indexOf(v)===i);
  }

  function renderResult(){
    const {observations:obs,interpretation:reading}=currentReading||{};if(!obs||!reading)return;
    const color=colorById(obs.colorId);const region=regionById(obs.regionId);const accession=reanalysisId?savedSpecimens.find(d=>d.id===reanalysisId)?.id:nextAccession(obs.colorId).id;
    root.querySelector('#resultSpecNo').textContent=reanalysisId?`Re-analysis · ${accession}`:`Next accession · ${accession}`;
    root.querySelector('#resultName').textContent=color.name;root.querySelector('#resultRegion').textContent=`${region.label} · Lake Michigan`;
    root.querySelector('#rarityFill').style.width=`${color.rarity*10}%`;root.querySelector('#rarityValue').textContent=`${color.rarity} / 10`;
    root.querySelector('#resultStone').style.background=`linear-gradient(145deg,rgba(255,255,255,.52),${color.hex} 62%,${color.hex})`;
    root.querySelector('#resultSummary').innerHTML=`Best current match: <em>${reading.source.toLowerCase()}</em>. ${reading.evidence[0]||'The available clues support a cautious field interpretation.'}`;
    root.querySelector('#rarityPill').textContent=rarityLabel(color.rarity);root.querySelector('#shorePill').textContent=`${region.label} shoreline`;root.querySelector('#wearPill').textContent=shortMark(obs.mark);root.querySelector('#strengthPill').textContent=reading.strength;root.querySelector('#datingConfidencePill').textContent=`Dating confidence · ${reading.datingConfidence}`;
    root.querySelector('#originText').textContent=reading.source;root.querySelector('#thicknessText').textContent=shortThickness(obs.thickness);root.querySelector('#formText').textContent=shortForm(obs.form);root.querySelector('#opacityText').textContent=obs.opacity?obs.opacity.charAt(0).toUpperCase()+obs.opacity.slice(1):'Not recorded';root.querySelector('#markText').textContent=shortMark(obs.mark);root.querySelector('#diagnosticText').textContent=diagnosticLabel(obs);root.querySelector('#periodText').textContent=reading.period;root.querySelector('#dateBasisNote').textContent=reading.datingBasis;
    root.querySelector('#regionalClue').textContent=region.colorNote?.[obs.colorId]||`${region.label} context is supporting evidence, not proof of source.`;
    root.querySelector('#colorNote').textContent=[color.note,...reading.evidence.slice(0,3)].filter(Boolean).join(' ');
    root.querySelector('#regionSpecificText').textContent=region.colorNote?.[obs.colorId]||'No strong color-specific regional clue is available for this combination.';root.querySelector('#regionalHistory').textContent=region.blurb;root.querySelector('#researchBasis').textContent=researchRefs(obs).join(' · ')+'.';
    root.querySelector('#colorRating').style.width=`${reading.colorRarity*10}%`;root.querySelector('#colorRatingValue').textContent=`${reading.colorRarity} / 10`;root.querySelector('#formRating').style.width=`${reading.formDistinctiveness*10}%`;root.querySelector('#formRatingValue').textContent=`${reading.formDistinctiveness} / 10`;root.querySelector('#historyRating').style.width=`${reading.historyInterest*10}%`;root.querySelector('#historyRatingValue').textContent=`${reading.historyInterest} / 10`;
    root.querySelector('#knownPlace').textContent=obs.foundAt||'Not recorded';root.querySelector('#knownDate').textContent=obs.foundDate?formatDate(obs.foundDate):'Not recorded';root.querySelector('#knownNote').textContent=obs.collectorNote||'No collector note recorded.';
    const unresolved=reading.strength==='Unresolved'||reading.datingConfidence==='Broad'||reading.cautions.length>0;root.querySelector('#uncertainNote').hidden=!unresolved;if(unresolved) root.querySelector('#uncertainText').textContent=reading.cautions[0]||'The current evidence remains broad. A manufacturing mark, finish, base feature, or clearer chemistry clue could substantially change this reading.';
    const tags=root.querySelector('#sourceTags');tags.innerHTML='';[reading.source,...color.sources].filter(Boolean).forEach(s=>{const span=document.createElement('span');span.className='source-tag';span.textContent=s;tags.appendChild(span);});
    root.querySelector('#saveSpecimenBtn').textContent=reanalysisId?'Update interpretation →':'Save to collection →';
  }

  function formatDate(value){try{return new Date(String(value).length===10?value+'T00:00:00':value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}catch{return String(value||'');}}
  function formatDateTime(value){if(!value)return 'Not recorded';try{return new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}catch{return 'Not recorded';}}

  root.querySelector('#analyzeBtn').addEventListener('click',()=>{const obs=selectedObservation();const interpretation=evaluateSpecimen(obs);currentReading={observations:obs,interpretation};renderResult();show('result');});

  function mirrorInterpretation(record){
    const i=record.interpretation;record.color=colorById(record.observations.colorId).hex;record.provenance=provenanceText(record.observations);record.period=i.period;record.rarity=`${i.colorRarity} / 10`;record.source=i.source;record.notes=[...(i.evidence||[]),i.datingBasis?`Dating basis: ${i.datingBasis}`:''].filter(Boolean).join(' ');record.lastAnalyzedAt=i.analyzedAt;
  }

  root.querySelector('#saveSpecimenBtn').addEventListener('click',async()=>{
    if(!currentReading)return;
    if(reanalysisId){
      const record=savedSpecimens.find(d=>d.id===reanalysisId);if(!record)return;
      if(record.interpretation) record.interpretationHistory.unshift({...record.interpretation,replacedAt:new Date().toISOString()});
      record.observations={...currentReading.observations,legacy:false};record.interpretation={...currentReading.interpretation};record.name=colorById(record.observations.colorId).name;mirrorInterpretation(record);markArchiveChanged();await persistArchive();const id=record.id;reanalysisId=null;currentReading=null;renderAll();openDetail(id);return;
    }
    const obs=currentReading.observations;const reading=currentReading.interpretation;const accession=nextAccession(obs.colorId);accessionCounters[obs.colorId]=accession.number;
    const record={key:`saved-${Date.now()}`,id:accession.id,accessionColor:obs.colorId,accessionNumber:accession.number,accessionedAt:new Date().toISOString(),name:colorById(obs.colorId).name,observations:{...obs},interpretation:{...reading},interpretationHistory:[]};mirrorInterpretation(record);savedSpecimens.unshift(record);markArchiveChanged();await persistArchive();currentReading=null;renderAll();show('collection');
  });

  function specimenBeach(d){return d.observations?.foundAt||legacyFoundAt(d.provenance)||null;}
  function recordNeedsUpdate(d){return d.interpretation?.logicVersion!==LOGIC_VERSION;}
  function incompleteObservations(d){return d.observations?.legacy||!d.observations||!d.observations.form||!d.observations.mark;}

  function renderHome(){
    const metrics=[...root.querySelectorAll('.metrics .metric b')];const colors=new Set(savedSpecimens.map(d=>d.accessionColor).filter(Boolean));const beaches=new Set(savedSpecimens.map(specimenBeach).filter(Boolean));
    if(metrics[0])metrics[0].textContent=String(savedSpecimens.length).padStart(2,'0');if(metrics[1])metrics[1].textContent=String(colors.size).padStart(2,'0');if(metrics[2])metrics[2].textContent=String(beaches.size).padStart(2,'0');
    const label=root.querySelector('.home-archive-heading .section-label');const strip=root.querySelector('[data-screen="home"] .find-strip');strip.innerHTML='';
    if(!savedSpecimens.length){label.textContent='Recent accessions · none yet';const card=document.createElement('div');card.className='find-card empty-accession';card.innerHTML='<div class="stone clear"></div><b>Your archive starts here</b><small>Identify a find, then save it</small>';strip.appendChild(card);return;}
    label.textContent='Recent accessions';savedSpecimens.slice(0,3).forEach(d=>{const card=document.createElement('div');card.className='find-card';card.innerHTML=`<div class="stone" style="background:linear-gradient(145deg,rgba(255,255,255,.55),${d.color||'#c8d8d4'} 68%,${d.color||'#c8d8d4'})"></div><b>${escapeHtml(d.name||'Saved specimen')}</b><small>${escapeHtml(d.id)}</small>`;card.addEventListener('click',()=>openDetail(d.id));strip.appendChild(card);});
  }

  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  function populateFilters(){
    const colorSelect=root.querySelector('#filterColor');const chosen=colorSelect.value;colorSelect.innerHTML='<option value="">All colors</option>';GLASS_COLORS.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;colorSelect.appendChild(o);});colorSelect.value=chosen;
    const beachSelect=root.querySelector('#filterBeach');const beachChosen=beachSelect.value;beachSelect.innerHTML='<option value="">All beaches</option>';[...new Set(savedSpecimens.map(specimenBeach).filter(Boolean))].sort().forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;beachSelect.appendChild(o);});beachSelect.value=beachChosen;
  }

  function periodRange(period){
    const text=String(period||'').toLowerCase().replace(/[–—‑]/g,'-');
    const spans=[];const add=(start,end)=>{if(Number.isFinite(start)&&Number.isFinite(end))spans.push([start,end]);};
    for(const match of text.matchAll(/\b(1[7-9]\d{2}|20\d{2})(s)?\b/g)){const y=Number(match[1]);add(y,match[2]?y+9:y);}
    const centuryStarts={'18th':1700,'19th':1800,'20th':1900,'21st':2000};
    for(const match of text.matchAll(/\b(?:(very early|early|mid|late)[ -]?)?(18th|19th|20th|21st)\b/g)){
      const start=centuryStarts[match[2]],qualifier=match[1]||'';
      if(qualifier==='very early')add(start,start+14);else if(qualifier==='early')add(start,start+24);else if(qualifier==='mid')add(start+25,start+74);else if(qualifier==='late')add(start+75,start+99);else add(start,start+99);
    }
    if(!spans.length)return null;
    let start=Math.min(...spans.map(s=>s[0])),end=Math.max(...spans.map(s=>s[1]));
    if(/\b(onward|present|modern|today)\b/.test(text))end=new Date().getFullYear();
    return {start,end};
  }
  function periodYears(period){const range=periodRange(period);return range?[range.start,range.end]:[];}
  function eraClasses(d){
    const range=periodRange(d.interpretation?.period);const eras=new Set();
    if(d.interpretation?.datingConfidence==='Broad'||!range)eras.add('broad');
    if(!range)return eras;
    if(range.start<1900)eras.add('pre1900');
    if(range.end>=1900&&range.start<=1949)eras.add('1900-1949');
    if(range.end>=1950)eras.add('1950plus');
    return eras;
  }

  function filteredRecords(){
    const q=root.querySelector('#collectionSearch').value.trim().toLowerCase();const color=root.querySelector('#filterColor').value;const beach=root.querySelector('#filterBeach').value;const era=root.querySelector('#filterEra').value;const status=root.querySelector('#filterStatus').value;const sort=root.querySelector('#sortCollection').value;
    let rows=savedSpecimens.filter(d=>{
      if(color&&d.accessionColor!==color)return false;if(beach&&specimenBeach(d)!==beach)return false;if(era&&!eraClasses(d).has(era))return false;
      if(status==='diagnostic'&&d.interpretation?.datingConfidence!=='Diagnostic')return false;if(status==='unresolved'&&d.interpretation?.datingConfidence!=='Broad'&&d.interpretation?.source!=='Unresolved')return false;if(status==='legacy'&&!incompleteObservations(d))return false;
      if(q){const hay=[d.id,d.name,d.provenance,d.source,d.period,d.notes,d.observations?.diagnosticText,d.observations?.collectorNote].join(' ').toLowerCase();if(!hay.includes(q))return false;}return true;
    });
    rows=[...rows];
    if(sort==='oldest') rows.sort((a,b)=>new Date(a.accessionedAt||0)-new Date(b.accessionedAt||0));
    else if(sort==='rarity') rows.sort((a,b)=>(b.interpretation?.colorRarity||0)-(a.interpretation?.colorRarity||0));
    else if(sort==='color') rows.sort((a,b)=>`${a.accessionColor}-${a.accessionNumber}`.localeCompare(`${b.accessionColor}-${b.accessionNumber}`,undefined,{numeric:true}));
    else if(sort==='beach') rows.sort((a,b)=>String(specimenBeach(a)||'').localeCompare(String(specimenBeach(b)||'')));
    else rows.sort((a,b)=>new Date(b.accessionedAt||0)-new Date(a.accessionedAt||0));
    return rows;
  }

  function renderColorSummary(){
    const wrap=root.querySelector('#colorSummary');wrap.innerHTML='';const counts={};savedSpecimens.forEach(d=>{counts[d.accessionColor]=(counts[d.accessionColor]||0)+1;});
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([id,count])=>{const c=colorById(id);const btn=document.createElement('button');btn.type='button';btn.className='color-chip'+(root.querySelector('#filterColor').value===id?' active':'');btn.textContent=`${c.name} ${count}`;btn.addEventListener('click',()=>{const select=root.querySelector('#filterColor');select.value=select.value===id?'':id;renderCollection();});wrap.appendChild(btn);});
  }

  function renderIntelligence(){
    const wrap=root.querySelector('#collectionIntelligence');wrap.innerHTML='';if(!savedSpecimens.length)return;
    const raritySorted=[...savedSpecimens].sort((a,b)=>(b.interpretation?.colorRarity||0)-(a.interpretation?.colorRarity||0));const rare=raritySorted[0];
    const dated=savedSpecimens.map(d=>({d,years:periodYears(d.interpretation?.period)})).filter(x=>x.years.length);dated.sort((a,b)=>Math.min(...a.years)-Math.min(...b.years));const oldest=dated[0]?.d;
    const beaches={};savedSpecimens.forEach(d=>{const b=specimenBeach(d);if(b)beaches[b]=(beaches[b]||0)+1;});const topBeach=Object.entries(beaches).sort((a,b)=>b[1]-a[1])[0];
    const colors={};savedSpecimens.forEach(d=>colors[d.accessionColor]=(colors[d.accessionColor]||0)+1);const topColor=Object.entries(colors).sort((a,b)=>b[1]-a[1])[0];
    const diagnostic=savedSpecimens.filter(d=>d.interpretation?.datingConfidence==='Diagnostic').length;const unresolved=savedSpecimens.filter(d=>d.interpretation?.datingConfidence==='Broad'||d.interpretation?.source==='Unresolved').length;
    const pre=savedSpecimens.filter(d=>eraClasses(d).has('pre1900')).length,twenty=savedSpecimens.filter(d=>eraClasses(d).has('1900-1949')||eraClasses(d).has('1950plus')).length;
    const cards=[
      ['Oldest probable',oldest?oldest.id:'No dated specimen',oldest?.interpretation?.period||'Add diagnostic clues'],
      ['Rarest color',rare?colorById(rare.accessionColor).name:'—',rare?`${rare.interpretation?.colorRarity||'—'} / 10 · ${rare.id}`:'—'],
      ['Most-found beach',topBeach?.[0]||'Not enough provenance',topBeach?`${topBeach[1]} specimens`:'Record a beach to build this'],
      ['Most collected color',topColor?colorById(topColor[0]).name:'—',topColor?`${topColor[1]} specimens`:'—'],
      ['Dating profile',`${diagnostic} diagnostic`,`${pre} pre-1900 · ${twenty} 1900+`],
      ['Needs another look',`${unresolved} broad / unresolved`,`${savedSpecimens.filter(incompleteObservations).length} legacy observation records`]
    ];
    cards.forEach(([label,value,sub])=>{const card=document.createElement('div');card.className='intel-card';card.innerHTML=`<small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b><span>${escapeHtml(sub)}</span>`;wrap.appendChild(card);});
  }

  function renderBackup(){
    const el=root.querySelector('#backupStatus');const span=el.querySelector('span');
    if(!archiveMeta.lastExportAt){span.textContent='No export recorded yet. Your collection exists only on this device/browser.';return;}
    const changed=(Number(archiveMeta.revision)||0)>(Number(archiveMeta.lastExportRevision)||0);const delta=savedSpecimens.length-(Number(archiveMeta.lastExportCount)||0);
    if(!changed) span.textContent=`Backed up ${formatDateTime(archiveMeta.lastExportAt)} · archive unchanged since export.`;
    else if(delta>0) span.textContent=`${delta} specimen${delta===1?'':'s'} added since your ${formatDateTime(archiveMeta.lastExportAt)} backup. Export again to protect the latest archive.`;
    else span.textContent=`Archive changed since your ${formatDateTime(archiveMeta.lastExportAt)} backup. Export again to preserve edits or re-analysis.`;
  }

  function renderCollection(){
    populateFilters();renderColorSummary();renderIntelligence();renderBackup();const rows=filteredRecords();const grid=root.querySelector('#collectionGrid');grid.innerHTML='';root.querySelector('#collectionCount').textContent=`${rows.length}${rows.length!==savedSpecimens.length?` of ${savedSpecimens.length}`:''} ${savedSpecimens.length===1?'specimen':'specimens'}`;
    if(!rows.length){const empty=document.createElement('div');empty.className='collection-empty';empty.innerHTML=`<b>${savedSpecimens.length?'No specimens match these filters.':'No specimens saved yet.'}</b><p>${savedSpecimens.length?'Clear a filter or search term to see the rest of the archive.':'Identify a piece of lake glass and save its observation record to begin.'}</p>`;grid.appendChild(empty);return;}
    rows.forEach(d=>{
      const card=document.createElement('article');card.className='spec-card';card.tabIndex=0;
      const flags=[];if(recordNeedsUpdate(d))flags.push('<span class="spec-flag attention">New interpretation available</span>');if(incompleteObservations(d))flags.push('<span class="spec-flag attention">Legacy observations</span>');if(d.interpretation?.datingConfidence==='Diagnostic')flags.push('<span class="spec-flag">Diagnostic dating</span>');
      card.innerHTML=`<div class="spec-id">${escapeHtml(d.id)} · ${escapeHtml(specimenBeach(d)||'Location not recorded')}</div><div class="stone" style="background:linear-gradient(145deg,rgba(255,255,255,.55),${d.color||'#c8d8d4'} 68%,${d.color||'#c8d8d4'})"></div><h3>${escapeHtml(d.name||'Saved specimen')}</h3><p>${escapeHtml(d.interpretation?.source||'Unresolved')} · ${escapeHtml((d.interpretation?.period||'Broad date only').toLowerCase())}</p>${flags.length?`<div class="spec-flags">${flags.join('')}</div>`:''}`;
      card.addEventListener('click',()=>openDetail(d.id));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(d.id);}});grid.appendChild(card);
    });
  }

  ['collectionSearch','filterColor','filterBeach','filterEra','filterStatus','sortCollection'].forEach(id=>{const el=root.querySelector('#'+id);el?.addEventListener(id==='collectionSearch'?'input':'change',renderCollection);});

  function observationValue(label,value){return `<div class="observation-item"><small>${escapeHtml(label)}</small><b>${escapeHtml(value||'Not recorded')}</b></div>`;}

  function openDetail(id){
    const d=savedSpecimens.find(x=>x.id===id);if(!d)return;activeDetailId=id;const o=d.observations||{};const i=d.interpretation||{};
    root.querySelector('#detailId').textContent=d.id;root.querySelector('#detailName').textContent=d.name;root.querySelector('#detailProvenance').textContent=provenanceText(o)||d.provenance||'Not recorded';root.querySelector('#detailPeriod').textContent=i.period||'Broad date only';root.querySelector('#detailRarity').textContent=`${i.colorRarity||numberFromRarity(d.rarity,d.accessionColor)} / 10 · ${rarityLabel(i.colorRarity||numberFromRarity(d.rarity,d.accessionColor))}`;root.querySelector('#detailSource').textContent=i.source||'Unresolved';root.querySelector('#detailDatingConfidence').textContent=i.datingConfidence||'Broad';root.querySelector('#detailAnalyzedAt').textContent=formatDateTime(i.analyzedAt||d.lastAnalyzedAt);
    root.querySelector('#detailSummary').textContent=incompleteObservations(d)?'This accession predates structured observation storage. Its known provenance and earlier interpretation are preserved, but some physical selections need to be re-entered before a full modern re-analysis.':'The observed specimen record is preserved separately from the current interpretation.';
    const colorObs=colorById(o.colorId||d.accessionColor).name;const accessionColor=colorById(d.accessionColor).name;root.querySelector('#detailObservations').innerHTML=[
      observationValue('Accession color',accessionColor),observationValue('Recorded color',colorObs),observationValue('Thickness',shortThickness(o.thickness)),observationValue('Surviving form',shortForm(o.form)),observationValue('Opacity',o.opacity),observationValue('Surface / marking',shortMark(o.mark)),observationValue('Diagnostic feature',diagnosticLabel(o)),observationValue('Found at',o.foundAt||'Not recorded'),observationValue('Found on',o.foundDate?formatDate(o.foundDate):'Not recorded'),observationValue('Collector note',o.collectorNote||'None recorded')
    ].join('');
    root.querySelector('#detailNotes').textContent=[...(i.evidence||[]),...(i.cautions||[]),i.datingBasis?`Dating basis: ${i.datingBasis}`:'',d.notes&&i.logicVersion==='legacy'?`Legacy note: ${d.notes}`:''].filter(Boolean).join(' ')||'No interpretation notes recorded.';
    renderHistory(d);
    const reBtn=root.querySelector('#reanalyzeSpecimenBtn');reBtn.textContent=incompleteObservations(d)?'Enter observations & re-analyze':'Re-analyze stored clues';if(recordNeedsUpdate(d)&&!incompleteObservations(d))reBtn.textContent='Apply newest interpretation →';
    root.querySelector('#editName').value=d.name||'';root.querySelector('#editFoundAt').value=o.foundAt||'';root.querySelector('#editFoundDate').value=o.foundDate||'';root.querySelector('#editCollectorNote').value=o.collectorNote||'';root.querySelector('#editSheet').classList.remove('active');show('detail');
  }

  function renderHistory(d){
    const wrap=root.querySelector('#interpretationHistory');const history=d.interpretationHistory||[];wrap.innerHTML='';if(!history.length){wrap.innerHTML='<p>No earlier interpretations. The next re-analysis will preserve the current reading here.</p>';return;}
    history.forEach(h=>{const div=document.createElement('div');div.className='history-entry';div.innerHTML=`<small>${escapeHtml(formatDateTime(h.analyzedAt||h.replacedAt))} · logic ${escapeHtml(h.logicVersion||'legacy')}</small><b>${escapeHtml(h.source||'Unresolved')} · ${escapeHtml(h.period||'Broad date')}</b><p>${escapeHtml(h.datingBasis||h.evidence?.[0]||'Earlier Lakeglass interpretation.')}</p>`;wrap.appendChild(div);});
  }

  root.querySelector('#reanalyzeSpecimenBtn').addEventListener('click',()=>{const d=savedSpecimens.find(x=>x.id===activeDetailId);if(!d)return;beginReanalysis(d);});

  function beginReanalysis(d){
    reanalysisId=d.id;const o=d.observations||{};state.region=o.regionId||'unsure';state.color=o.colorId||d.accessionColor||'aqua';state.thickness=o.thickness||'unknown';state.form=o.form||'unknown';state.opacity=o.opacity||null;state.mark=o.mark||'smooth';state.diagnosticKey=o.diagnosticKey||null;state.diagnostic=o.diagnostic||null;state.diagnosticText=o.diagnosticText||'';state.datingAnswer=o.datingAnswer||null;
    setChoice('region',state.region);setChoice('thickness',state.thickness);setChoice('form',state.form);setChoice('opacity',state.opacity);setChoice('mark',state.mark);selectColor(state.color);root.querySelector('#foundAt').value=o.foundAt||'';root.querySelector('#foundDate').value=o.foundDate||'';root.querySelector('#collectorNote').value=o.collectorNote||'';root.querySelector('#identifyEyebrow').textContent=`Re-analysis · ${d.id}`;root.querySelector('#identifyQuestion').textContent=incompleteObservations(d)?'Complete the observation record.':'Review the stored observations.';root.querySelector('#analyzeBtn').textContent='Re-analyze specimen →';renderDynamicQuestions();show('identify');
  }

  root.querySelector('#editSpecimenBtn').addEventListener('click',()=>root.querySelector('#editSheet').classList.add('active'));
  root.querySelector('#cancelEditBtn').addEventListener('click',()=>root.querySelector('#editSheet').classList.remove('active'));
  root.querySelector('#saveEditBtn').addEventListener('click',async()=>{
    const d=savedSpecimens.find(x=>x.id===activeDetailId);if(!d)return;d.name=root.querySelector('#editName').value.trim()||d.name;d.observations=d.observations||{};d.observations.foundAt=root.querySelector('#editFoundAt').value.trim();d.observations.foundDate=root.querySelector('#editFoundDate').value||null;d.observations.collectorNote=root.querySelector('#editCollectorNote').value.trim();d.provenance=provenanceText(d.observations);markArchiveChanged();await persistArchive();renderAll();openDetail(d.id);
  });

  root.querySelector('#deleteSpecimenBtn').addEventListener('click',async()=>{
    const index=savedSpecimens.findIndex(x=>x.id===activeDetailId);if(index<0)return;const d=savedSpecimens[index];if(!window.confirm(`Delete ${d.id} from your collection? Its accession number will not be reused.`))return;savedSpecimens.splice(index,1);activeDetailId=null;markArchiveChanged();await persistArchive();renderAll();show('collection');
  });

  root.querySelector('#exportCollectionBtn').addEventListener('click',async()=>{
    archiveMeta.lastExportAt=new Date().toISOString();archiveMeta.lastExportCount=savedSpecimens.length;archiveMeta.lastExportRevision=archiveMeta.revision;await persistArchive();renderBackup();
    const payload={app:'Lakeglass',version:5,schemaVersion:5,logicVersion:LOGIC_VERSION,accessionSystem:'per-color',accessionCounters:{...accessionCounters},archiveMeta:{...archiveMeta},exportedAt:archiveMeta.lastExportAt,specimens:savedSpecimens};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`lakeglass-collection-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
  });

  const importInput=root.querySelector('#importCollectionFile');root.querySelector('#importCollectionBtn').addEventListener('click',()=>importInput.click());
  importInput.addEventListener('change',()=>{const file=importInput.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=async()=>{try{const parsed=JSON.parse(String(reader.result||''));const rows=Array.isArray(parsed)?parsed:parsed.specimens;if(!Array.isArray(rows))throw new Error('Invalid archive');savedSpecimens.splice(0,savedSpecimens.length,...normalizeRows(rows.slice(0,1000)));Object.keys(accessionCounters).forEach(k=>delete accessionCounters[k]);if(parsed.accessionCounters&&typeof parsed.accessionCounters==='object')Object.entries(parsed.accessionCounters).forEach(([k,v])=>{const n=Number(v);if(Number.isInteger(n)&&n>0)accessionCounters[k]=n;});mergeCounters();archiveMeta.revision=(Number(archiveMeta.revision)||0)+1;archiveMeta.lastExportAt=parsed.exportedAt||new Date().toISOString();archiveMeta.lastExportCount=savedSpecimens.length;archiveMeta.lastExportRevision=archiveMeta.revision;await persistArchive();renderAll();show('collection');}catch(err){window.alert('That file is not a valid Lakeglass collection export.');}importInput.value='';};reader.readAsText(file);});

  function renderAll(){renderHome();renderCollection();}

  initColorChoices();renderDynamicQuestions();renderAll();restoreArchive();

  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{}));
})();
