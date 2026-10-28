import argparse,json,re,unicodedata,sys
from pathlib import Path
import pdfplumber
sys.stdout.reconfigure(encoding='utf-8')
parser=argparse.ArgumentParser(description='Re-extract talent text from locally supplied PDF rulebooks.')
parser.add_argument('--pdf-dir',type=Path,required=True,help='Directory containing the three source PDFs; never committed.')
args=parser.parse_args()
Path('tmp/pdfs').mkdir(parents=True,exist_ok=True)
books={
'core':(args.pdf_dir / 'imperium maledictum core rulebook.pdf',102,118),
'mechanicus':(args.pdf_dir / 'imperium-maledictum-adeptus-mechanicus-player-guide.pdf',66,72),
'inquisition':(args.pdf_dir / 'imperium maledictum inqusition player guide.pdf',63,68)}
blocks={}
for book,(path,start,end) in books.items():
 result=[]
 with pdfplumber.open(path) as pdf:
  for page_index in range(start-1,end):
   p=pdf.pages[page_index]
   for col,(left,right) in enumerate([(35,304.7),(304.7,577)]):
    page_chars=p.chars
    if book=='core' and page_index==108:
     # Saints sidebar spans both columns above the talent text.
     cutoff=min(c['top'] for c in page_chars if 'Novarese' in c['fontname'] and 13<c['size']<15 and c['x0']<304 and c['top']>350)
     page_chars=[c for c in page_chars if c['top']>=cutoff-1]
    chars=[c for c in page_chars if left<=c['x0']<right and c['top']>=62 and c['bottom']<735 and not (c['top']>715 and (c['x0']<50 or c['x0']>556))]
    groups=[]
    for c in sorted(chars,key=lambda c:c['bottom']):
     if not groups or abs(c['bottom']-groups[-1][0]['bottom'])>2:groups.append([c])
     else:groups[-1].append(c)
    for group in groups:
     ordered=sorted(group,key=lambda c:c['x0']);text='';prev=None
     for c in ordered:
      if prev and c['x0']-prev['x1']>1.7 and not text.endswith(' ') and c['text']!=' ':text+=' '
      text+=('•' if 'onlyskulls' in c['fontname'] and c['text']=='0' else c['text']);prev=c
     text=re.sub(r'\s+',' ',text).strip()
     if not text:continue
     heading=any('Novarese' in c['fontname'] and c['size']>=12.5 for c in group)
     if heading and result and result[-1]['heading'] and result[-1]['page']==page_index+1 and result[-1]['col']==col and min(c['top'] for c in group)-result[-1]['bottom']<14:
      result[-1]['text']+=' '+text;result[-1]['bottom']=max(c['bottom'] for c in group)
     else:result.append({'page':page_index+1,'col':col,'top':min(c['top'] for c in group),'bottom':max(c['bottom'] for c in group),'heading':heading,'text':text})
 blocks[book]=result
Path('tmp/pdfs/talent-blocks.json').write_text(json.dumps(blocks,ensure_ascii=False,indent=2),encoding='utf-8')
for book,lines in blocks.items():
 print('\n',book)
 for line in lines:
  if line['heading']:print(line['page'],line['col'],line['text'])
