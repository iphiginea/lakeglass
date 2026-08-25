(()=>{
  const DB='lakeglass-archive';
  const STORE='collection';
  const MAP={specimens:'specimensV5',accessionCounters:'accessionCountersV5',archiveMeta:'archiveMetaV5'};
  const originalGet=IDBObjectStore.prototype.get;
  const originalPut=IDBObjectStore.prototype.put;
  const originalDelete=IDBObjectStore.prototype.delete;
  function mapped(store,key){
    try{
      if(store.transaction?.db?.name===DB&&store.name===STORE&&typeof key==='string'&&MAP[key]) return MAP[key];
    }catch(e){}
    return key;
  }
  IDBObjectStore.prototype.get=function(key){return originalGet.call(this,mapped(this,key));};
  IDBObjectStore.prototype.put=function(value,key){return originalPut.call(this,value,mapped(this,key));};
  IDBObjectStore.prototype.delete=function(key){return originalDelete.call(this,mapped(this,key));};
  window.LAKEGLASS_V5_ISOLATED_STORAGE=true;
})();