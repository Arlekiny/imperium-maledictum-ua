/* Name matches always precede matches in descriptions and other fields. */
(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory();else root.ArchiveSearch=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const fold=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
 function create(records){
  const index=records.map((record,position)=>{const names=[record.en,record.uk];const suffix=' ('+record.en+')';if(String(record.uk).endsWith(suffix))names.push(record.uk.slice(0,-suffix.length));return {record,position,names:names.map(fold),text:fold([record.en,record.uk,...(record.fields||[]).flatMap(field=>field.slice(1))].join(' '))};});
  return query=>{const q=fold(query);if(!q)return [];const terms=q.split(' '),matches=[];
   for(const item of index){let rank;
    if(item.names.some(name=>name===q))rank=0;
    else if(item.names.some(name=>name.startsWith(q)))rank=1;
    else if(item.names.some(name=>name.includes(q)))rank=2;
    else if(item.names.some(name=>terms.every(term=>name.includes(term))))rank=3;
    else if(terms.every(term=>item.text.includes(term)))rank=4;
    else continue;
    matches.push({...item,rank});
   }
   return matches.sort((a,b)=>a.rank-b.rank||a.position-b.position).map(item=>item.record);
  };
 }
 return {fold,create};
});
