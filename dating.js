(()=>{
  const root=document.getElementById('lake-glass-mockup');
  if(!root) return;

  const chemistryAnswers={};
  const sessionPeriods=new Map();

  const scoreKey={
    color:{label:'Color rarity',help:'1 = very common around Lake Michigan · 10 = exceptionally rare'},
    form:{label:'Form distinctiveness',help:'1 = generic fragment · 10 = unusually diagnostic form'},
    history:{label:'Historical interest',help:'1 = little dating/history information · 10 = highly informative'}
  };

  function selectedValue(group){
    return root.querySelector(`[data-group="${group}"] .choice.selected`)?.dataset.value||null;
  }

  function selectedColor(){
    return root.querySelector('#colorChoices .swatch.selected')?.dataset.value||'aqua';
  }

  function diagnosticKey(){
    const mark=selectedValue('mark');
    const form=selectedValue('form');
    const color=selectedColor();
    if(mark==='letters') return 'embossing';
    if(form==='rim'||form==='neck') return 'seam';
    if(form==='base') return 'base';
    if(color==='lavender') return 'manganese';
    if(color==='black') return 'backlight';
    if(color==='milkglass') return 'milk';
    if(color==='slag') return 'slag';
    return null;
  }

  function diagnosticValue(){
    return root.querySelector('#diagnosticChoices .choice.selected')?.dataset.value||null;
  }

  function foundAt(){
    return (root.querySelector('#foundAt')?.value||'').trim().toLowerCase();
  }

  function setRating(rowId,label){
    const track=root.querySelector(rowId);
    const row=track?.closest('.rating-row');
    const text=row?.querySelector('.rating-label');
    if(text) text.textContent=label;
  }

  function clarifyRatings(){
    setRating('#colorRating',scoreKey.color.label);
    setRating('#formRating',scoreKey.form.label);
    setRating('#historyRating',scoreKey.history.label);

    const detailRarity=root.querySelector('#detailRarity');
    const detailLabel=detailRarity?.parentElement?.querySelector('small');
    if(detailLabel) detailLabel.textContent='Color rarity';

    const section=root.querySelector('#colorRating')?.closest('.intel-section');
    if(section&&!section.querySelector('.rating-key')){
      const key=document.createElement('div');
      key.className='rating-key';
      key.innerHTML=`<b>How to read the 1–10 scales</b><span>${scoreKey.color.help}</span><span>${scoreKey.form.help}</span><span>${scoreKey.history.help}</span>`;
      section.appendChild(key);
    }

    const guide=[...root.querySelectorAll('[data-screen="guide"] details')].find(d=>d.querySelector('summary')?.textContent.includes('Lake Michigan occurrence'));
    const guideCopy=guide?.querySelector('p');
    if(guideCopy) guideCopy.textContent='Color rarity runs from 1 to 10: 1–2 very common · 3–4 familiar · 5–6 uncommon · 7–8 rare · 9 very rare · 10 exceptional. A higher number always means the color is harder to encounter around Lake Michigan.';

    const method=[...root.querySelectorAll('[data-screen="methodology"] details')].find(d=>d.querySelector('summary')?.textContent.includes('Occurrence index'));
    const methodSummary=method?.querySelector('summary');
    const methodCopy=method?.querySelector('p');
    if(methodSummary) methodSummary.textContent='Color rarity index';
    if(methodCopy) methodCopy.textContent='The color-rarity score is a comparative Lakeglass field index: 1 means very common and 10 means exceptionally rare around Lake Michigan. Form distinctiveness uses 1 for a generic fragment and 10 for a highly diagnostic surviving form. Historical interest uses 1 for little chronological information and 10 for an unusually informative dating or provenance clue.';
  }

  function installRatingStyles(){
    if(document.getElementById('lakeglass-dating-styles')) return;
    const style=document.createElement('style');
    style.id='lakeglass-dating-styles';
    style.textContent=`
      #lake-glass-mockup .rating-key{margin-top:14px;padding:14px 15px;border:1px solid #d7e0dd;border-radius:15px;background:rgba(248,251,249,.72);display:grid;gap:5px;color:#718084;font-size:10.5px;line-height:1.45}
      #lake-glass-mockup .rating-key b{color:#38565d;font-size:10px;letter-spacing:.08em;text-transform:uppercase}
      #lake-glass-mockup .dating-clue{margin-top:18px}
      #lake-glass-mockup .dating-clue[hidden]{display:none}
      #lake-glass-mockup .dating-clue .diagnostic-panel{border-color:#cddbd7;background:linear-gradient(145deg,rgba(249,252,250,.96),rgba(240,247,244,.88))}
      #lake-glass-mockup .dating-basis{margin-top:7px;color:#718084;font-size:10.5px;line-height:1.45}
      @media(max-width:760px){#lake-glass-mockup .rating-key{font-size:11.5px;padding:15px}#lake-glass-mockup .dating-basis{font-size:11.5px}}
    `;
    document.head.appendChild(style);
  }

  const datingQuestions={
    white:{
      question:'Against white paper in daylight, does the clear glass have a faint tint?',
      help:'Subtle decolorizer tints can be more useful for dating than “clear” by itself.',
      options:[['amethyst','Faint lavender / amethyst'],['straw','Faint straw / honey'],['gray','Faint gray'],['colorless','No obvious tint'],['unclear','Hard to tell']]
    },
    yellow:{
      question:'Is the yellow only a faint straw tint in otherwise clear glass?',
      help:'A pale straw cast can come from selenium/arsenic decolorized colorless glass rather than intentionally yellow glass.',
      options:[['straw','Yes · mostly clear with straw tint'],['trueyellow','No · distinctly yellow glass'],['unclear','Hard to tell']]
    },
    gray:{
      question:'Is this essentially colorless glass with only a faint gray cast?',
      help:'A faint gray tint in otherwise colorless bottle glass has some dating utility; true gray decorative glass does not.',
      options:[['tint','Yes · faint gray tint'],['truegray','No · clearly gray glass'],['unclear','Hard to tell']]
    },
    canary:{
      question:'If you have a UV light, does it fluoresce vivid green?',
      help:'A strong green fluorescence supports uranium-colored glass. “Not tested” is completely fine.',
      options:[['uvyes','Yes · vivid green fluorescence'],['uvno','No fluorescence'],['untested','Not tested']]
    }
  };

  function ensureDatingQuestion(){
    const identify=root.querySelector('[data-screen="identify"]');
    const diagnostic=root.querySelector('#diagnosticGroup');
    if(!identify||!diagnostic) return;
    let group=root.querySelector('#datingClueGroup');
    if(!group){
      group=document.createElement('div');
      group.className='identify-group dating-clue';
      group.id='datingClueGroup';
      group.hidden=true;
      group.innerHTML='<div class="group-label">Dating clue · optional</div><div class="diagnostic-panel"><div class="diagnostic-question" id="datingQuestion"></div><p class="diagnostic-help" id="datingHelp"></p><div class="choice-list" id="datingChoices"></div><p class="dating-basis">Used only when the clue has documented chronological value; otherwise Lakeglass keeps the date broad.</p></div>';
      diagnostic.after(group);
    }
    renderDatingQuestion();
  }

  function renderDatingQuestion(){
    const group=root.querySelector('#datingClueGroup');
    if(!group) return;
    const color=selectedColor();
    const config=datingQuestions[color];
    if(!config){group.hidden=true;return;}
    group.hidden=false;
    root.querySelector('#datingQuestion').textContent=config.question;
    root.querySelector('#datingHelp').textContent=config.help;
    const choices=root.querySelector('#datingChoices');
    choices.innerHTML='';
    config.options.forEach(([value,label])=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='choice'+(chemistryAnswers[color]===value?' selected':'');
      button.dataset.value=value;
      button.textContent=label;
      button.addEventListener('click',()=>{
        chemistryAnswers[color]=value;
        choices.querySelectorAll('.choice').forEach(b=>b.classList.remove('selected'));
        button.classList.add('selected');
      });
      choices.appendChild(button);
    });
  }

  function result(text,interest,basis){return {text,interest,basis};}

  function estimatePeriod(){
    const color=selectedColor();
    const key=diagnosticKey();
    const diagnostic=diagnosticValue();
    const place=foundAt();
    const chem=chemistryAnswers[color];

    if(key==='base'&&diagnostic==='pontil') return result('Usually pre-1870s · utilitarian bottles often pre-1865',10,'Pontil scars are strong mid-19th-century-or-earlier manufacturing evidence.');
    if(key==='seam'&&diagnostic==='through') return result('Machine-made · usually after ca. 1910; overwhelmingly common after 1917',9,'Automatic bottle production expanded rapidly after 1905; by 1917 roughly 90–95% of U.S. bottles and jars were machine-made.');
    if(key==='seam'&&diagnostic==='stops') return result('Mouth-blown · usually pre-1915; uncommon by the early 1920s',9,'Hand-tooled finishes largely disappeared during the 1910s to early 1920s transition to machine production.');
    if(key==='base'&&diagnostic==='machine') return result('Machine-made · generally post-1905; most likely after the mid-1910s',9,'Machine-made body/base features begin with the automatic-bottle era and dominate U.S. production by 1917.');
    if(key==='embossing'&&diagnostic&&diagnostic!=='unclear') return result('Maker or product mark present · exact research may narrow the date',9,'Embossing can sometimes identify a maker, product, plant, or date code more precisely than color.');

    if(color==='lavender'){
      if(key==='manganese'&&diagnostic==='solarized') return result('ca. 1890–1920 probable · some manganese examples continue into the 1930s',9,'Pale solarized amethyst is strongly associated with manganese-decolorized colorless glass.');
      if(key==='manganese'&&diagnostic==='deep') return result('If true intentionally purple bottle glass: chiefly 1840s–early 1880s · decorative glass can be later',7,'True purple bottle glass and solarized manganese glass have different chronologies.');
      return result('If solarized manganese glass: ca. 1890–1920 probable',7,'Lavender is dateable only when solarization is the better explanation than intentional purple color.');
    }

    if(color==='white'){
      if(chem==='amethyst') return result('ca. 1890–1920 probable · some examples into the 1930s',9,'A faint amethyst tint supports manganese-decolorized colorless glass.');
      if(chem==='straw') return result('Usually mid-1910s or later · often ca. 1915–mid-20th century',8,'A faint straw tint is associated with selenium/arsenic-decolorized machine-made glass and is unlikely much before World War I.');
      if(chem==='gray') return result('ca. 1915–1925 tendency · exceptions occur',7,'A faint gray tint in otherwise colorless bottle glass clusters around this period but is not absolute.');
      return result('Colorless bottle glass: uncommon before the 1870s; increasingly common after the mid-1910s',4,'Untinted clear glass alone gives only a broad chronology.');
    }

    if(color==='yellow'){
      if(chem==='straw') return result('Usually mid-1910s or later · often ca. 1915–mid-20th century',8,'A straw cast in otherwise colorless glass can reflect selenium/arsenic decolorization.');
      return result('True yellow glass · no reliable color-only date range',3,'Intentionally yellow glass spans multiple decorative and specialty uses; other manufacturing clues are needed.');
    }

    if(color==='gray'){
      if(chem==='tint') return result('ca. 1915–1925 tendency · exceptions occur',7,'A subtle gray tint in otherwise colorless bottle glass has limited chronological value.');
      return result('True gray glass · date unresolved from color alone',3,'Gray specialty, leaded, tile, and decorative glass spans multiple periods.');
    }

    if(color==='canary'){
      if(chem==='uvyes') return result('If uranium-colored glass: widespread ca. 1830s–1940s',8,'Museum conservation research documents widespread uranium use in colored glass from the 1830s through the 1940s.');
      return result('Canary / Vaseline color · UV confirmation needed for the uranium date range',5,'The yellow-green color suggests uranium glass but fluorescence is a stronger field clue.');
    }

    if(color==='aqua') return result('American aqua bottle glass broadly ca. 1800–1930 · machine-made non-soda/non-canning examples usually pre-1920s',6,'Aqua is common in U.S. bottles before the 1930s and becomes much less common as colorless machine-made glass takes over.');
    if(color==='seafoam') return result('If utilitarian blue-green bottle glass: usually 19th to very early 20th century',5,'Blue-green bottle colors are uncommon on machine-made bottles and generally favor earlier manufacture.');
    if(color==='darkaqua'||color==='teal') return result('If utilitarian blue-green glass: often 19th to very early 20th century · decorative/insulator glass may be later',5,'Blue-green color has some dating value only after probable object type is considered.');
    if(color==='lime') return result('Bright “7-up” green is overwhelmingly 20th century · rare late-19th-century exceptions',5,'Very bright green is rarely seen on 19th-century bottles and becomes characteristic in the 20th century.');
    if(color==='olive') return result('Olive bottle glass favors the 19th century · olive amber uncommon after ca. 1890 and nearly absent after 1900',7,'Wine and champagne are important later exceptions; object type still matters.');
    if(color==='black') return result('Historic black bottle glass chiefly pre-1880s · U.S. mouth-blown examples uncommon after ca. 1880',8,'Imported black bottles persist somewhat later but largely disappear during the 1890s.');
    if(color==='purple') return result('If true purple bottle glass: chiefly 1840s–early 1880s · decorative glass can be later',7,'True intentionally purple bottle glass is distinct from solarized manganese glass.');
    if(color==='milkglass') return result('Cosmetic/toiletry bottles mainly ca. 1870–1920 · cream/ointment jars often 1890s–mid-20th century',7,'Milk glass is strongly tied to cosmetic, toiletry, ointment, and cream containers in these periods.');
    if(color==='cobalt') return result('Color alone is broad · bottle uses documented from the 1840s onward; inks extend into the 1930s',4,'Cobalt has limited dating utility because it was used for many bottle classes over a long period.');

    if(color==='slag'){
      if(place.includes('leland')) return result('Leland iron-smelting slag · ca. 1870–1885',10,'Leland Blue is waste from the Leland iron furnace, which operated from 1870 to 1885.');
      if(place.includes('frankfort')||place.includes('elberta')) return result('Frankfort / Elberta iron-smelting slag · ca. 1870–1883',10,'Frankfort Iron Works began producing iron in 1870 and ceased operations in 1883.');
      return result('Industrial slag · local furnace attribution needed for a tighter date',7,'Named Michigan slag traditions can be dated to individual iron works, but color alone cannot identify the furnace.');
    }

    if(color==='opalescent') return result('Often early-20th-century decorative glass · color alone is not a firm date',4,'Opalescent glass is most useful when combined with form or known decorative-glass patterns.');
    if(color==='pink') return result('Often 20th-century decorative/household glass · sun-altered manganese is another possibility',4,'Pink has multiple causes and uses, so a color-only range would be too confident.');
    if(color==='brown') return result('Amber / brown spans many periods · no reliable color-only date',3,'Amber is common across beverage, medicine, bitters, and household bottles and needs manufacturing clues for dating.');
    if(color==='green') return result('Green spans many periods · no reliable color-only date',3,'Most green shades have limited chronological value without form, finish, or manufacturing evidence.');
    if(color==='red'||color==='orange') return result('Rare color, but no reliable color-only manufacture date',4,'Rarity is not the same as chronological value; specialty and decorative uses span multiple periods.');

    return result('Broad date only · stronger manufacturing clue needed',2,'Color alone does not provide a defensible narrow chronology for this specimen.');
  }

  function appendDatingSource(){
    const research=root.querySelector('#researchBasis');
    if(!research) return;
    const source='Society for Historical Archaeology — Historic Glass Bottle Identification';
    if(!research.textContent.includes('Society for Historical Archaeology')) research.textContent=`${research.textContent.replace(/\.$/,'')} · ${source}.`;
  }

  function applyHistoryScore(score){
    const value=Math.max(1,Math.min(10,Number(score)||1));
    const fill=root.querySelector('#historyRating');
    const text=root.querySelector('#historyRatingValue');
    if(fill) fill.style.width=`${value*10}%`;
    if(text) text.textContent=`${value} / 10`;
  }

  function enhanceResult(){
    clarifyRatings();
    const estimate=estimatePeriod();
    const period=root.querySelector('#periodText');
    if(period) period.textContent=estimate.text;
    applyHistoryScore(estimate.interest);
    appendDatingSource();

    let basis=root.querySelector('#dateBasisNote');
    const periodCell=period?.closest('.data-cell');
    if(periodCell){
      if(!basis){basis=document.createElement('small');basis.id='dateBasisNote';basis.className='dating-basis';periodCell.appendChild(basis);}
      basis.textContent=estimate.basis;
    }
  }

  function accessionIdFromResult(){
    const text=root.querySelector('#resultSpecNo')?.textContent||'';
    const match=text.match(/LM\.[A-Z0-9]+\.\d+/);
    return match?match[0]:null;
  }

  function openArchiveDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){resolve(null);return;}
      const req=indexedDB.open('lakeglass-archive',1);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function patchSavedPeriod(id,period){
    try{
      const db=await openArchiveDb();
      if(!db||!db.objectStoreNames.contains('collection')){db?.close();return;}
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('collection','readwrite');
        const store=tx.objectStore('collection');
        const req=store.get('specimens');
        req.onsuccess=()=>{
          const rows=Array.isArray(req.result)?req.result:[];
          const row=rows.find(d=>d&&d.id===id);
          if(row){row.period=period;store.put(rows,'specimens');}
        };
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
      db.close();
    }catch(err){}
  }

  function patchVisibleCollection(id,period){
    root.querySelectorAll('.spec-card').forEach(card=>{
      const idText=card.querySelector('.spec-id')?.textContent||'';
      if(!idText.startsWith(id)) return;
      const copy=card.querySelector('p');
      if(copy){
        const source=copy.textContent.split(' · ')[0]||'Unresolved';
        copy.textContent=`${source} · ${period.toLowerCase()}`;
      }
    });
  }

  function rememberSavedPeriod(){
    const id=accessionIdFromResult();
    const period=root.querySelector('#periodText')?.textContent;
    if(!id||!period) return;
    sessionPeriods.set(id,period);
    [250,800,1500].forEach(delay=>setTimeout(()=>patchSavedPeriod(id,period),delay));
    setTimeout(()=>patchVisibleCollection(id,period),50);
  }

  installRatingStyles();
  clarifyRatings();
  ensureDatingQuestion();

  root.addEventListener('click',event=>{
    if(event.target.closest('#colorChoices .swatch')) setTimeout(renderDatingQuestion,0);
    if(event.target.closest('#analyzeBtn')) setTimeout(enhanceResult,0);
    if(event.target.closest('#saveSpecimenBtn')) setTimeout(rememberSavedPeriod,0);
    const card=event.target.closest('.spec-card');
    if(card){
      const id=(card.querySelector('.spec-id')?.textContent||'').split(' · ')[0];
      const override=sessionPeriods.get(id);
      if(override) setTimeout(()=>{const detail=root.querySelector('#detailPeriod');if(detail)detail.textContent=override;},0);
    }
  });
})();