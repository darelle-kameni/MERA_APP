#!/usr/bin/env python3
"""
Post-traitement du rapport MERA :
- remplace les images des figures (ESP32, capteurs, RFID, captures application),
- corrige la page de garde (nom du stagiaire et axe),
- recalcule les champs du document.
"""
import os
import re
import shutil
import subprocess
import zipfile

DOCX = '/home/darelle/Documents/MERA_APP/Rapport_de_stage_ENSPD (MERA).docx'
WORK = '/tmp/opencode/work'
PREP = '/tmp/opencode/prepared'

# figure -> fichier source prepare
MEDIA_REPLACE = {
    'word/media/image5.jpeg': f'{PREP}/fig1_esp32.jpg',
    'word/media/image6.jpeg': f'{PREP}/fig2_max30102.jpg',
    'word/media/image7.jpeg': f'{PREP}/fig3_mlx90614.jpg',
    'word/media/image8.jpeg': f'{PREP}/fig4_rfid.jpg',
    'word/media/image18.png': f'{PREP}/fig_dashboard.png',
}

# corrections XML
XML_REPLACE = [
    ('DOMCHE Freedy Jores', 'DJOGU KAMENI Darelle'),
    ('Génie Réseau et Télécommunication', 'Génie Logiciel'),
]

print('Extraction...')
if os.path.exists(WORK):
    shutil.rmtree(WORK)
os.makedirs(WORK)
with zipfile.ZipFile(DOCX) as z:
    names = z.namelist()
    z.extractall(WORK)

print('Remplacement des images...')
for target, source in MEDIA_REPLACE.items():
    dst = os.path.join(WORK, target)
    if not os.path.exists(dst):
        print('  ATTENTION introuvable:', target)
        continue
    shutil.copyfile(source, dst)
    print(f'  {target} <- {os.path.basename(source)}')

# Légendes des logos (zones de texte) : supprime la numérotation « Figure N : »
# qui redémarre à 1 et entre en conflit avec les figures principales.
TEXTBOX_CAPTION_RE = re.compile(
    r'<w:r><w:t xml:space="preserve">Figure </w:t></w:r>'
    r'<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    r'<w:r><w:instrText xml:space="preserve">SEQ Figure \\\* ARABIC </w:instrText></w:r>'
    r'<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    r'<w:r><w:t>\d+</w:t></w:r>'
    r'<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    r'<w:r><w:t xml:space="preserve"> : Logo</w:t></w:r>'
)
TEXTBOX_CAPTION_REPL = '<w:r><w:t xml:space="preserve">Logo</w:t></w:r>'

print('Corrections XML...')
changed = 0
for root, _, files in os.walk(WORK):
    for fn in files:
        if not fn.endswith('.xml'):
            continue
        path = os.path.join(root, fn)
        with open(path, 'r', encoding='utf-8') as f:
            data = f.read()
        orig = data
        for old, new in XML_REPLACE:
            if old in data:
                data = data.replace(old, new)
        n_caps = len(TEXTBOX_CAPTION_RE.findall(data))
        if n_caps:
            data = TEXTBOX_CAPTION_RE.sub(TEXTBOX_CAPTION_REPL, data)
            print(f'  légendes logos dénumérotées: {n_caps}')
        if data != orig:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(data)
            changed += 1
            print('  modifié:', os.path.relpath(path, WORK))
print('  fichiers modifiés:', changed)

print('Reconstruction du docx...')
tmp_out = DOCX + '.tmp'
with zipfile.ZipFile(tmp_out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in names:
        z.write(os.path.join(WORK, name), name)
os.replace(tmp_out, DOCX)
print('OK:', DOCX)

print('Conversion PDF...')
subprocess.run(
    ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir',
     '/tmp/opencode/pdf', DOCX],
    check=True, capture_output=True, timeout=180)
pdf = '/tmp/opencode/pdf/' + os.path.basename(DOCX).replace('.docx', '.pdf')
info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
for line in info.splitlines():
    if line.startswith(('Pages', 'Page size')):
        print(line)
