import argparse,json,re,unicodedata,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
parser=argparse.ArgumentParser(description='Re-extract talent text from locally supplied PDF rulebooks.')
parser.add_argument('--pdf-dir',type=Path,required=True,help='Directory containing the three source PDFs; never committed.')
args=parser.parse_args()
Path('tmp/pdfs').mkdir(parents=True,exist_ok=True)
rows=json.loads(re.search(r'const TALENTS = (\[[\s\S]*?\n\]);',Path('src/character.html').read_text(encoding='utf-8'))[1]);blocks=json.loads(Path('tmp/pdfs/talent-blocks.json').read_text(encoding='utf-8'))
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).lower())
aliases={'amalanthianapprentice':'amalathianapprentice','ballisticsforensics':'ballisticforensics'}
bookNames={'core':'Core Rulebook','mechanicus':"Adeptus Mechanicus Player’s Guide",'inquisition':"Inquisition Player’s Guide"}
sourceFiles={'core':'imperium maledictum core rulebook.pdf','mechanicus':'imperium-maledictum-adeptus-mechanicus-player-guide.pdf','inquisition':'imperium maledictum inqusition player guide.pdf'}
result=[]
for index,row in enumerate(rows):
 en=[s for s in re.findall(r'\(([^()]+)\)',row[0]) if re.search('[A-Za-z]',s)]
 en=en[-1] if en else row[0].split(' (')[0]
 wanted=aliases.get(norm(en),norm(en));preferred='mechanicus' if 'Mechanicus' in row[3] else 'inquisition' if 'Inquisitor' in row[3] else 'core'
 matches=[]
 for book,lines in blocks.items():
  for i,line in enumerate(lines):
   n=norm(line['text'])
   if line['heading'] and (n==wanted or (wanted=='architecturalmind' and n.endswith(wanted))):matches.append((book,i))
 assert matches,en
 book,start=next((m for m in matches if m[0]==preferred),matches[0]);lines=blocks[book];selected=[]
 for line in lines[start+1:]:
  if line['heading']:break
  selected.append(line)
 paragraphs=[];last=None
 for line in selected:
  text=re.sub(r'^•\s*','• ',line['text']).replace('\u00ad','').replace('Y ou','You')
  new=not paragraphs or (last and line['page']==last['page'] and line['col']==last['col'] and line['top']-last['bottom']>5) or text.startswith('• ')
  if new:paragraphs.append(text)
  else:paragraphs[-1]+= ('' if paragraphs[-1].endswith('-') else ' ')+text
  last=line
 assert paragraphs,en
 result.append({'index':index,'name':en,'originalName':{'Amalanthian Apprentice':'Amalathian Apprentice','Ballistics Forensics':'Ballistic Forensics'}.get(en,en),'book':bookNames[book],'bookId':book,'page':lines[start]['page'],'pdfPage':lines[start]['page'],'endPage':selected[-1]['page'],'sourceFile':sourceFiles[book],'sourceHeading':lines[start]['text'],'paragraphs':paragraphs,'sourceDiffersFromSummary':book!=preferred})
# Keep related sidebars and reference tables separate from the quoted talent.
for talent_name,heading,title in [('Blank','theblanksburden','The Blank’s Burden'),('Condemn the Witch','emperorsaegis','Emperor’s Aegis'),('Inheritor','inheritance','Inheritance')]:
 lines=blocks['core'];start=next(i for i,line in enumerate(lines) if line['heading'] and norm(line['text'])==heading)
 related=[]
 for line in lines[start+1:]:
  if line['heading']:break
  related.append(line['text'])
 entry=next(r for r in result if r['name']==talent_name)
 entry['related']=[{'title':title,'page':lines[start]['page'],'paragraphs':[' '.join(related)]}]
import pdfplumber
for book,page,targets in [('core',106,['Devoted Servant']),('mechanicus',71,['Electro-Priest Indoctrination','Corpuscarii Benedictions','Corpuscarii Mastery','Fulgurite Hex','Fulgurite Mastery'])]:
 with pdfplumber.open(str(args.pdf_dir/sourceFiles[book])) as pdf:
  found=pdf.pages[page-1].extract_tables()
  table=next(t for t in found if 'DEVOTED' in str(t[0]) or 'MOTIVE' in str(t[0]))
  cleaned=[[re.sub(r'\s+',' ',cell or '').strip() for cell in row] for row in table]
  extra_table={'title':'Devoted Servant Table' if book=='core' else 'Motive Force and Machines','page':page,'headers':cleaned[1],'rows':cleaned[2:]}
  for entry in result:
   if entry['name'] in targets:entry['relatedTables']=[extra_table]
Path('src/talent-details.json').write_text(json.dumps({'version':1,'language':'en','origin':'User-supplied PDFs; line breaks and typographic spacing normalized.','talents':result},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for r in result:
 print(r['name'],r['bookId'],r['page'],sum(map(len,r['paragraphs'])),'DIFFERENT SOURCE' if r['sourceDiffersFromSummary'] else '')
audit={'count':len(result),'sourceDifferences':[{'name':r['name'],'book':r['book'],'page':r['page']} for r in result if r['sourceDiffersFromSummary']], 'suspectEndings':[{'name':r['name'],'last':r['paragraphs'][-1]} for r in result if r['paragraphs'][-1][-1] not in '.!?)]']}
Path('evidence/talent-extraction-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
