import json,re
from pathlib import Path
base=Path('src/locale/review-equipment-work');out={}
for source,files in [('clothingAndPersonalGear',['clothing']),('medicaeEquipement',['medicae']),('tools',['tools-a','tools-b'])]:
 rows=json.loads(Path('src/data/'+source+'.json').read_text(encoding='utf-8-sig'))
 reviewed=[]
 for f in files:reviewed+=json.loads((base/(f+'.json')).read_text(encoding='utf-8-sig'))
 assert len(rows)==len(reviewed),(source,len(rows),len(reviewed))
 for row,(name,effect) in zip(rows,reviewed):out[row['Name']]=name;out[row['Effect']]=effect
out.update({
'Mono-Blade Scalpel Profile':'Профіль монолезового скальпеля',
'Silent Needle Profile':'Профіль безшумної голки',
'Inflict (Poisoned). While Poisoned, character takes 1 Damage at the start of their turn, ignoring Armour.':'Спричинення (Отруєння). Поки триває Отруєння, персонаж отримує 1 Шкоди на початку свого ходу, ігноруючи Броню.',
'Spec':'Спеціалізація','DMG':'Шкода','Cost':'Ціна','Avail':'Доступність','Enc':'Обтяження','Traits':'Риси','One-handed':'Одноручна','1 + StrB':'1 + БС','Rare':'Рідкісна','Penetrating (2)':'Пробивна (2)'})
digits=lambda x:sorted(re.findall(r'\d+',x))
bad=[(k,v) for k,v in out.items() if digits(k)!=digits(v)]
for k,v in bad: print(ascii(k),ascii(v),digits(k),digits(v))
assert not bad
Path('src/locale/review-equipment.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Total translations',len(out))
