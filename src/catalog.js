/* Canonical table map; keys remain stable when labels are translated. */
const CATALOG = [
  {id:'home',title:'Головна',description:'Імена та довідкові таблиці 41-го тисячоліття.',tables:[['names','Таблиця імен','roll']]},
  {id:'character',title:'Персонаж',description:'Таланти · навички · ціни покращень',tables:[]},
  {id:'augmetics',title:'Аугметика',description:'Аугметичні імпланти й удосконалення.',tables:[['augmetics','Сила у сталі']]},
  {id:'combat',title:'Бій',description:'Дії, риси, стани та бойові довідкові таблиці.',tables:[['combatActions','Бойові дії'],['traits','Риси'],['conditions','Стани'],['environmentalTraits','Властивості середовища'],['hitLocations','Ділянки влучання','roll'],['fumbles','Невдалі дії','roll']]},
  {id:'equipment',title:'Спорядження',description:'Особисте спорядження, інструменти та медичне обладнання.',tables:[['clothingAndPersonalGear','Одяг та особисте спорядження'],['tools','Інструменти'],['medicaeEquipement','Медичне обладнання']]},
  {id:'protection',title:'Захист',description:'Броня, силові поля та модифікації броні.',tables:[['armour','Броня'],['forceFields','Силові поля'],['armourModifications','Модифікації броні']]},
  {id:'psy',title:'Псайкери',description:'Псайкерські дисципліни, феномени та небезпеки Варпу.',tables:[['psyPowers','Псайкерські сили','Discipline'],['psychicPhenomena','Псайкерські феномени','roll'],['perilsOfTheWarp','Небезпеки Варпу','roll']]},
  {id:'services',title:'Послуги',description:'Подорожі, проживання, харчування та медичні послуги.',tables:[['cityHiveTravel','Подорожі містом і вуликом','ordered'],['planetaryTravel','Планетарні подорожі','ordered'],['systemTravel','Подорожі системою','ordered'],['interstellarTravel','Міжзоряні подорожі','ordered'],['accomodationsServices','Проживання й помешкання','ordered'],['provisionsServices','Провізія та харчування','ordered'],['medicalServices','Медична допомога','ordered']]},
  {id:'weapons',title:'Зброя',description:'Стрілецька й рукопашна зброя, вибухівка, боєприпаси та модифікації.',tables:[['rangedWeapons','Стрілецька зброя'],['meleeWeapons','Рукопашна зброя'],['explosiveWeapons','Гранати й вибухівка'],['customAmmunitions','Спеціальні боєприпаси'],['weaponModifications','Модифікації зброї']]},
  {id:'criticalwounds',title:'Рани й травми',description:'Критичні рани за ділянками влучання, а також незначні й значні травми.',tables:[['Head','Рани голови','roll'],['Arm','Рани рук','roll'],['Body','Рани тулуба','roll'],['Leg','Рани ніг','roll'],['injuries','Травми']]}
];
const BOOKS = [
  ['core','Core','Core Rulebook'],
  ['mechanicus','Mechanicus',"Adeptus Mechanicus Player's Guide"],
  ['inquisitor','Inquisitor',"Inquisitor Player's Guide"],
  ['macharian','Macharian','Macharian Requisition Guide']
];
if (typeof module !== 'undefined' && module.exports) module.exports = { CATALOG, BOOKS };
