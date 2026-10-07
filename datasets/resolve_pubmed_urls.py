"""Remplace les URLs « recherche PubMed » (?term=...) par des identifiants
d'articles réels (https://pubmed.ncbi.nlm.nih.gov/<PMID>/).

Méthode :
  1. esearch : "<plante latine>" AND "<maladie en anglais>", top 5
  2. esummary : titre de chaque article
  3. vérification : le nom binomial de la plante (ou, à défaut, les mots
     significatifs du terme latin) doit apparaître dans le titre.
     Sans ça -> l'entrée reste en URL de recherche (et sera étiquetée
     « recherche » dans l'interface, jamais « vérifiée »).

Aucune donnée n'est inventée : on ne lie que ce que PubMed retourne.

Usage :
  python3 resolve_pubmed_urls.py            # tout résoudre
  python3 resolve_pubmed_urls.py --dry-run   # statistiques sans écriture
  python3 resolve_pubmed_urls.py --limit 10  # échantillon
"""

import json
import re
import sys
import time
import csv
import urllib.parse
import urllib.request

from fix_pubmed_urls import LATIN

EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
DELAY = 0.36  # NCBI: 3 requêtes/s sans clé API
UA = 'MERA-pharmacopee/1.0 (dataset source_url resolution; contact: mera-app)'

# Maladie (FR, tel que dans le dataset) -> termes de recherche anglais
DISEASE_EN = {
  'Acné': 'acne',
  'Acouphène (complément)': 'tinnitus',
  'Amibiase': 'amebiasis',
  'Anxiété / attaque de panique': 'anxiety panic attack',
  'Anémie': 'anemia',
  'Aphte / lésions buccales': 'aphthous stomatitis oral lesions',
  'Arthrose / rhumatisme': 'osteoarthritis rheumatism',
  'Asthme / bronchospasme': 'asthma bronchospasm',
  'Blépharite infectieuse': 'infectious blepharitis',
  'Brûlure chimique (œil) (complément)': 'chemical eye burn',
  'Brûlure d\'estomac': 'heartburn gastroesophageal reflux',
  'Brûlures': 'burns',
  'Calculs biliaires (complément)': 'gallstones cholelithiasis',
  'Calculs rénaux (complément)': 'kidney stones nephrolithiasis',
  'Cataracte': 'cataract',
  'Chikungunya / Dengue': 'chikungunya dengue',
  'Cholestérol élevé': 'hypercholesterolemia',
  'Cicatrisation lente': 'wound healing',
  'Cirrhose (complément)': 'cirrhosis',
  'Colique néonatale': 'neonatal colic',
  'Coliques infantiles': 'infant colic infantile colic',
  'Conjonctivite allergique': 'allergic conjunctivitis',
  'Conjonctivite bactérienne': 'bacterial conjunctivitis',
  'Conjonctivite virale': 'viral conjunctivitis',
  'Constipation': 'constipation',
  'Contraception d\'urgence traditionnelle': 'emergency contraception',
  'Contracture musculaire': 'muscle contracture',
  'Coryza / nez bouché': 'common cold nasal congestion',
  'Crevasses / peau gercée': 'chapped skin fissures skin',
  'Cystite': 'cystitis',
  'Cécité nocturne (nyctalopie)': 'night blindness nyctalopia',
  'Dentition difficile': 'teething',
  'Dermatite couche': 'diaper dermatitis nappy rash',
  'Diabète de type 2': 'type 2 diabetes mellitus',
  'Diarrhée': 'diarrhea',
  'Douleur / crampes abdominales': 'abdominal pain cramps',
  'Douleur / inflammation': 'pain inflammation',
  'Douleur chronique (complément)': 'chronic pain',
  'Douleur de morsure de serpent (complément)': 'snakebite snake bite pain',
  'Douleur dentaire': 'toothache dental pain',
  'Douleur neuropathique': 'neuropathic pain',
  'Douleur post-opératoire': 'postoperative pain',
  'Douleur post-partum': 'postpartum pain',
  'Douleurs articulaires': 'joint pain arthralgia',
  'Douleurs menstruelles': 'menstrual pain dysmenorrhea',
  'Dry eye syndrome': 'dry eye syndrome',
  'Dysenterie amibienne': 'amoebic dysentery',
  'Dysménorrhée (règles douloureuses)': 'dysmenorrhea',
  'Dyspepsie': 'dyspepsia',
  'Dysurie / brûlures urinaires': 'dysuria urinary burning',
  'Dépendance à l\'alcool (complément)': 'alcohol dependence alcoholism',
  'Dépression légère (complément)': 'mild depression',
  'Désaturation / dyspnée': 'hypoxemia dyspnea',
  'Déshydratation': 'dehydration',
  'Entorse / contusion': 'sprain contusion',
  'Entorse / foulure': 'sprain strain',
  'Entécolite spasmodique': 'spasmodic colitis enterocolitis',
  'Entérite / maladie de Crohn': 'enteritis Crohn disease',
  'Epilepsie (complément végétal)': 'epilepsy',
  'Épilepsie (adjunct)': 'epilepsy',
  'Fatigue / asthénie': 'fatigue asthenia',
  'Fièvre (chikungunya)': 'chikungunya fever',
  'Fièvre (paludisme probable)': 'malaria fever plasmodium',
  'Fièvre simple': 'fever pyrexia',
  'Fièvre typhoïde': 'typhoid fever enteric fever',
  'Galactogogue (stimulation lactation)': 'galactagogue breastfeeding lactation',
  'Gastrite / reflux': 'gastritis reflux',
  'Gastro-entérite': 'gastroenteritis',
  'Gingivite': 'gingivitis',
  'Glaucome': 'glaucoma',
  'Gonflement abdominal (ascite)': 'ascites abdominal swelling',
  'Goutte': 'gout',
  'Herpès labial': 'herpes labialis cold sore',
  'Hypertension': 'hypertension',
  'Hypertrophie prostatique (complément)': 'benign prostatic hyperplasia',
  'Hypotension': 'hypotension',
  'Hépatite': 'hepatitis',
  'Hépatite (complément)': 'hepatitis',
  'Hépatite B (complément)': 'hepatitis B',
  'Infection cutanée / plaie': 'skin infection wound infection',
  'Infection respiratoire aiguë': 'acute respiratory infection',
  'Infection urinaire': 'urinary tract infection',
  'Infection vaginale (candidose)': 'vaginal candidiasis vulvovaginal candidiasis',
  'Insecte venimeux (douleur)': 'venomous insect bite pain',
  'Insolation / coup de chaleur': 'heat stroke hyperthermia sunstroke',
  'Insomnie': 'insomnia',
  'Insuffisance rénale chronique (complément)': 'chronic kidney disease renal insufficiency',
  'Intoxication alimentaire (complément)': 'food poisoning foodborne illness',
  'Jaunisse (ictère)': 'jaundice icterus',
  'Laryngite / enrouement': 'laryngitis hoarseness',
  'Leucorrhée (pertes blanches)': 'leukorrhea vaginal discharge',
  'Lumbago / dorsalgie': 'low back pain dorsalgia',
  'Malnutrition (IMC bas)': 'malnutrition undernutrition',
  'Migraine / céphalée': 'migraine headache',
  'Migraine chronique (complément)': 'chronic migraine',
  'Moustiques (répulsif)': 'mosquito repellent mosquito bite prevention',
  'Mucoviscidose (complément)': 'cystic fibrosis',
  'Mycose cutanée': 'dermatophytosis fungal skin infection tinea',
  'Myopie': 'myopia',
  'Ménopause (atrophie vaginale)': 'menopause vaginal atrophy',
  'Ménopause (bouffées de chaleur)': 'menopause hot flashes vasomotor symptoms',
  'Ménorragie (règles abondantes)': 'menorrhagia heavy menstrual bleeding',
  'Neuropathie diabétique (complément)': 'diabetic neuropathy',
  'Névralgie faciale': 'facial neuralgia trigeminal neuralgia',
  'Obésité': 'obesity',
  'Orgelet': 'hordeolum stye',
  'Otite moyenne (complément)': 'otitis media',
  'Perte d\'appétit': 'appetite loss anorexia',
  'Pertes de sang abondantes (métrorragies)': 'metrorrhagia uterine bleeding',
  'Pharyngite / angine': 'pharyngitis sore throat tonsillitis',
  'Piqûre de scorpion (complément)': 'scorpion sting',
  'Protection solaire naturelle': 'sun protection sunscreen ultraviolet protection',
  'Prurit / démangeaisons': 'pruritus itching',
  'Psoriasis / eczéma': 'psoriasis eczema dermatitis',
  'Ptérygion': 'pterygium',
  'Rhinite allergique / sinusite': 'allergic rhinitis sinusitis',
  'Rougeole': 'measles',
  'Rétinopathie diabétique': 'diabetic retinopathy',
  'Sciatique / névralgie': 'sciatica neuralgia',
  'Shigellose': 'shigellosis bacillary dysentery',
  'Stomatite / muguet': 'oral thrush candidiasis stomatitis',
  'Stress / anxiété': 'stress anxiety',
  'Tabagisme (complément)': 'smoking cessation tobacco',
  'Tachycardie / palpitations': 'tachycardia palpitations',
  'Teigne / dermatophytose': 'tinea dermatophytosis ringworm',
  'Tendinite': 'tendinitis tendinopathy',
  'Thrombose veineuse (prévention)': 'venous thrombosis prevention deep vein thrombosis',
  'Toux chronique': 'chronic cough',
  'Toux infantile': 'pediatric cough cough in children',
  'Trachome': 'trachoma',
  'Ulcère gastroduodénal': 'peptic ulcer gastric ulcer',
  'Uvéite': 'uveitis',
  'Vers intestinaux (parasitose)': 'intestinal worms helminthiasis intestinal parasites',
  'Vertige / étourdissements': 'vertigo dizziness',
  'Vertige de Menière (complément)': 'Meniere disease vertigo',
}

BINOMIAL = re.compile(r'^[A-Z][a-z]+ [a-z]+$')
PMID_URL = re.compile(r'^https://pubmed\.ncbi\.nlm\.nih\.gov/\d+/$')


def _get_raw(url):
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode('utf-8', 'replace')
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise last


def _get(url):
    return json.loads(_get_raw(url))


def esearch(term, retmax=3):
    q = urllib.parse.quote(term)
    data = _get(f'{EUTILS}esearch.fcgi?db=pubmed&retmode=json&retmax={retmax}&sort=relevance&term={q}')
    return data.get('esearchresult', {}).get('idlist', [])


def efetch_text(pmid):
    q = urllib.parse.quote(pmid)
    return _get_raw(f'{EUTILS}efetch.fcgi?db=pubmed&id={q}&rettype=abstract&retmode=text')


def title_matches(latin, title):
    """Vrai seulement si l'article parle bien de la plante annoncée."""
    title_l = (title or '').lower()
    if BINOMIAL.match(latin):
        genus, species = latin.lower().split()
        return genus in title_l and species in title_l
    words = [w for w in re.findall(r'[a-z]{4,}', latin.lower())
             if w not in {'oral', 'solution', 'medicinal'}]
    return bool(words) and all(w in title_l for w in words)


def search_variants(latin, disease):
    """Requêtes de décroissance : plante + maladie complète, puis plante +
    un mot-clé discriminant de la maladie si la requête stricte est vide."""
    disease_en = DISEASE_EN.get(disease, disease)
    variants = [f'{latin} {disease_en}']
    words = sorted({w for w in re.findall(r"[a-z']{4,}", disease_en.lower())},
                   key=len, reverse=True)
    if words:
        variants.append(f'{latin} {words[0]}')
    return variants


def resolve(latin, disease):
    """-> (url, ok) : URL article vérifié, ou URL de recherche (ok=False).

    Un PMID n'est accepté que si le nom de la plante figure dans le titre
    ou le résumé de l'article — la co-occurrence maladie/plante est déjà
    garantie par la requête PubMed elle-même.
    """
    for term in search_variants(latin, disease):
        try:
            pmids = esearch(term)
        except Exception as exc:  # noqa: BLE001
            print(f'  ! esearch KO ({exc})')
            return search_url_for(term), False
        time.sleep(DELAY)
        if not pmids:
            continue
        for pmid in pmids:
            try:
                text = efetch_text(pmid)
            except Exception as exc:  # noqa: BLE001
                print(f'  ! efetch KO ({exc})')
                continue
            time.sleep(DELAY)
            if title_matches(latin, text):
                return f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/', True
    return search_url_for(search_variants(latin, disease)[0]), False


def search_url_for(term):
    return ('https://pubmed.ncbi.nlm.nih.gov/?term='
            + urllib.parse.quote_plus(term))



def main():
    dry = '--dry-run' in sys.argv
    force = '--force' in sys.argv
    limit = None
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])

    path = 'traditional_treatments.json'
    data = json.load(open(path))
    treats = data['treatments']
    if limit:
        treats = treats[:limit]

    resolved = skipped = unresolved = 0
    for i, t in enumerate(treats, 1):
        latin = LATIN.get(t['plant']['scientific_name'], t['plant']['scientific_name'])
        if not force and PMID_URL.match(t.get('source_url') or ''):
            skipped += 1
            resolved += 1
            print(f'[{i}/{len(treats)}] {"déjà OK":9} {t["disease"][:38]:38} <- {latin[:28]}', flush=True)
            continue
        url, ok = resolve(latin, t['disease'])
        resolved += ok
        unresolved += not ok
        mark = 'PMID' if ok else 'recherche'
        print(f'[{i}/{len(treats)}] {mark:9} {t["disease"][:38]:38} <- {latin[:28]}', flush=True)
        if not dry:
            t['source_url'] = url

    total = len(treats)
    print(f'\nAvec PMID réel : {resolved}/{total} ({100 * resolved // max(total, 1)}%)'
          f' — déjà résolus {skipped}, sans correspondance {unresolved}')
    if dry:
        print('Dry run : aucun fichier modifié.')
        return

    json.dump(data, open(path, 'w'), ensure_ascii=False, indent=2)
    print(f'JSON mis à jour : {path}')

    try:
        with open('traditional_treatments.csv', newline='', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        if rows and 'source_url' in rows[0]:
            index = {f'{t["disease"]}||{t["plant"]["scientific_name"]}': t
                     for t in data['treatments']}
            n = 0
            for r in rows:
                src = index.get(f'{r.get("disease")}||{r.get("plant_name_fr")}')
                if src and r.get('source_url') != src['source_url']:
                    r['source_url'] = src['source_url']
                    n += 1
            with open('traditional_treatments.csv', 'w', newline='', encoding='utf-8') as f:
                w = csv.DictWriter(f, fieldnames=rows[0].keys())
                w.writeheader()
                w.writerows(rows)
            print(f'CSV mis à jour : {n} lignes')
    except Exception as exc:  # noqa: BLE001
        print('CSV skip :', exc)


if __name__ == '__main__':
    main()
