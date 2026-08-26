(()=>{
  const DB='lakeglass-archive';
  const STORE='collection';
  const ORIGINAL_ROWS='specimens';
  const ORIGINAL_COUNTERS='accessionCounters';
  const V5_ROWS='specimensV5';
  const V5_COUNTERS='accessionCountersV5';
  const V5_META='archiveMetaV5';

  const msg=document.getElementById('v5msg');

  const openDb=()=>new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  const read=(db,key)=>new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  const writeMany=(db,entries)=>new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE);
    entries.forEach(([key,value])=>store.put(value,key));
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error('Lakeglass could not finish preparing local storage.'));
  });

  const ids=rows=>(Array.isArray(rows)?rows:[])
    .map(row=>String(row&&row.id||''))
    .filter(Boolean)
    .sort();

  const containsOriginal=(shadow,original)=>{
    const shadowIds=new Set(ids(shadow));
    return ids(original).every(id=>shadowIds.has(id));
  };

  const loadScript=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=()=>reject(new Error(`Could not load ${src}`));
    document.body.appendChild(script);
  });

  const renderFailure=err=>{
    const text=String(err&&err.message||err);
    document.body.innerHTML=`<div id="v5boot"><div class="v5card"><h1>Lakeglass did not open</h1><p>${text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</p><p>Your protected legacy archive was not modified.</p><a href="./recover.html">Check protected archive</a></div></div>`;
  };

  (async()=>{
    try{
      if(!('indexedDB' in window)) throw new Error('IndexedDB is unavailable in this browser.');

      const db=await openDb();
      const original=await read(db,ORIGINAL_ROWS);
      const originalCounters=await read(db,ORIGINAL_COUNTERS);
      let shadow=await read(db,V5_ROWS);
      let shadowCounters=await read(db,V5_COUNTERS);
      let shadowMeta=await read(db,V5_META);

      const originalRows=Array.isArray(original)?original:[];
      const hasAuthoritativeShadow=Array.isArray(shadow)&&shadowMeta&&shadowMeta.authoritative===true;
      const hasPromotableShadow=Array.isArray(shadow)&&shadowMeta&&shadowMeta.shadow===true&&(
        originalRows.length===0||containsOriginal(shadow,originalRows)
      );

      let source='v5';

      if(hasAuthoritativeShadow){
        source='v5';
      }else if(hasPromotableShadow){
        shadowMeta={
          ...shadowMeta,
          schemaVersion:5,
          authoritative:true,
          promotedAt:shadowMeta.promotedAt||new Date().toISOString()
        };
        await writeMany(db,[[V5_META,shadowMeta]]);
        source='v5';
      }else if(originalRows.length){
        shadow=structuredClone(originalRows);
        shadowCounters=structuredClone(originalCounters&&typeof originalCounters==='object'?originalCounters:{});
        shadowMeta={
          schemaVersion:5,
          revision:0,
          lastExportAt:null,
          lastExportCount:0,
          lastExportRevision:0,
          shadow:true,
          authoritative:true,
          baseOriginalIds:ids(originalRows),
          baseOriginalCount:originalRows.length,
          createdAt:new Date().toISOString(),
          promotedAt:new Date().toISOString()
        };
        await writeMany(db,[
          [V5_ROWS,shadow],
          [V5_COUNTERS,shadowCounters],
          [V5_META,shadowMeta]
        ]);
        source='legacy-seed';
      }else{
        shadow=[];
        shadowCounters={};
        shadowMeta={
          schemaVersion:5,
          revision:0,
          lastExportAt:null,
          lastExportCount:0,
          lastExportRevision:0,
          shadow:true,
          authoritative:true,
          baseOriginalIds:[],
          baseOriginalCount:0,
          createdAt:new Date().toISOString(),
          promotedAt:new Date().toISOString(),
          freshArchive:true
        };
        await writeMany(db,[
          [V5_ROWS,shadow],
          [V5_COUNTERS,shadowCounters],
          [V5_META,shadowMeta]
        ]);
        source='fresh';
      }

      db.close();

      const activeCount=Array.isArray(shadow)?shadow.length:0;
      if(msg){
        msg.textContent=source==='fresh'
          ? 'Starting a new on-device Lakeglass archive…'
          : `${activeCount} saved specimen${activeCount===1?'':'s'} found. Opening Lakeglass…`;
      }

      const html=await fetch('./v5-shell.html?main=1',{cache:'no-store'}).then(response=>{
        if(!response.ok) throw new Error('Could not load the Lakeglass interface.');
        return response.text();
      });
      const parsed=new DOMParser().parseFromString(html,'text/html');
      const root=parsed.querySelector('#lake-glass-mockup');
      if(!root) throw new Error('The Lakeglass interface is invalid.');

      document.body.innerHTML='';
      document.body.appendChild(document.importNode(root,true));

      await loadScript('./v5-data.js?main=1');
      await loadScript('./v5-storage-shim.js?main=1');
      await loadScript('./v5-app.js?main=1');

      await new Promise(resolve=>setTimeout(resolve,120));
      const identifyButton=document.querySelector('.nav [data-go="identify"]')||document.querySelector('[data-go="identify"]');
      const identifyScreen=document.querySelector('[data-screen="identify"]');
      const homeButton=document.querySelector('.nav [data-go="home"]')||document.querySelector('[data-go="home"]');
      if(!identifyButton||!identifyScreen||!homeButton) throw new Error('Lakeglass interaction controls were not found after startup.');

      identifyButton.click();
      await new Promise(resolve=>setTimeout(resolve,0));
      const interactionWorked=identifyScreen.classList.contains('active');
      homeButton.click();
      if(!interactionWorked) throw new Error('Lakeglass loaded visually, but its interaction controls did not attach.');

      if('serviceWorker' in navigator){
        navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
      }
    }catch(err){
      renderFailure(err);
    }
  })();
})();
