/** Per-client bounded cache. Only public read data belongs here. */
export function createReadCache(maxEntries=64, ttlMs=30_000) {
  const entries=new Map<string,{expires:number;value:unknown}>();
  return {
    get<T>(key:string):T|undefined {
      const entry=entries.get(key);
      if(!entry)return;
      if(entry.expires<=Date.now()){entries.delete(key);return;}
      entries.delete(key);entries.set(key,entry);
      return entry.value as T;
    },
    set<T>(key:string,value:T){entries.delete(key);entries.set(key,{expires:Date.now()+ttlMs,value});while(entries.size>maxEntries)entries.delete(entries.keys().next().value!);},
  };
}
