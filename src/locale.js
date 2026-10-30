/* Ukrainian display layer. Canonical English data and reference IDs remain unchanged. */
(function(root,factory){
  if(typeof module!=='undefined' && module.exports)module.exports=factory;
  else root.ArchiveLocale=factory(root.ARCHIVE_TRANSLATIONS || {},root.ARCHIVE_TRAIT_NAMES || {});
})(typeof globalThis!=='undefined'?globalThis:this,function(dictionary,traits={}){
  let language='uk';
  const text=value=>language!=='en' && Object.hasOwn(dictionary,String(value))?dictionary[String(value)]:String(value ?? '');
  const shortKeys=Object.keys(dictionary).filter(key=>key.length<65 && /^[A-Za-z][A-Za-z '-]*$/.test(key)).sort((a,b)=>b.length-a.length);
  const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=shortKeys.length?new RegExp('(?<![A-Za-z])('+shortKeys.map(escape).join('|')+')(?![A-Za-z])','g'):null;
  function label(value){if(language==='en')return String(value ?? '');const source=String(value ?? '');return text(source)!==source?text(source):(pattern?source.replace(pattern,key=>dictionary[key]):source);}
  function name(value){const source=String(value ?? ''),translated=label(source);return translated===source?source:translated+' ('+source+')';}
  function traitName(value,id){if(language==='en')return String(value);const source=String(value),translated=(traits[id] || label(id))+label(source.slice(id.length));return translated;}
  const header=key=>language==='en'?key:({Minor:'Незначна травма',Major:'Значна травма'}[key] || label(key));
  return {text,label,name,traitName,header,searchText:value=>dictionary[String(value)] || String(value ?? ''),getLanguage:()=>language,setLanguage(value){language=value==='en'?'en':'uk';}};
});
