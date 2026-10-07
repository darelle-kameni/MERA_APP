import json, re, csv
from urllib.parse import quote_plus

# Mapping plante (nom scientifique) -> terme PubMed latin/recherchable
LATIN = {
  'Ail (Allium sativum)': 'Allium sativum',
  'Aloe vera (aloès)': 'Aloe vera',
  'Anis vert (Pimpinella anisum)': 'Pimpinella anisum',
  'Annona muricata (Corossol)': 'Annona muricata',
  'Arachide (Arachis hypogaea)': 'Arachis hypogaea',
  'Arnica montana (Arnica)': 'Arnica montana',
  'Artemisia annua (armoise annuelle)': 'Artemisia annua',
  'Arthrophytum senegalense': 'Arthrophytum senegalense',
  'Artichaut (Cynara scolymus)': 'Cynara scolymus',
  'Aubépine (Crataegus oxyacantha)': 'Crataegus oxyacantha',
  'Azadirachta indica (neem)': 'Azadirachta indica',
  'Bael fruit (Aegle marmelos)': 'Aegle marmelos',
  'Banane plantain (Musa paradisiaca)': 'Musa paradisiaca',
  'Boswellia serrata (Oliban)': 'Boswellia serrata',
  'Calendula officinalis (Souci)': 'Calendula officinalis',
  'Calotropis procera': 'Calotropis procera',
  'Camomille matricaire': 'Matricaria chamomilla',
  'Canneberge (Vaccinium macrocarpon)': 'Vaccinium macrocarpon',
  'Capsicum annuum (Piment)': 'Capsicum annuum',
  'Carica papaya (Papayer)': 'Carica papaya',
  'Carotte (Daucus carota)': 'Daucus carota',
  'Catharanthus roseus': 'Catharanthus roseus',
  'Cerise (Prunus avium)': 'Prunus avium',
  'Chenopodium ambrosioides': 'Chenopodium ambrosioides',
  'Citronnelle (Cymbopogon citratus)': 'Cymbopogon citratus',
  'Coriandrum sativum (Coriandre)': 'Coriandrum sativum',
  'Curcuma (Curcuma longa)': 'Curcuma longa',
  'Eau de coco + sel + sucre (SRO maison)': 'oral rehydration solution',
  'Eucalyptus (Eucalyptus globulus)': 'Eucalyptus globulus',
  'Eucalyptus citriodora (Citronnelle de Java)': 'Corymbia citriodora',
  'Eufraise (Euphrasia officinalis)': 'Euphrasia officinalis',
  'Eurycoma longifolia (Tongkat Ali)': 'Eurycoma longifolia',
  'Fenouil (Foeniculum vulgare)': 'Foeniculum vulgare',
  'Garcinia cambogia': 'Garcinia cambogia',
  'Gaulthérie couchée (Gaultheria procumbens)': 'Gaultheria procumbens',
  'Gentiane (Gentiana lutea)': 'Gentiana lutea',
  'Gingembre (Zingiber officinale)': 'Zingiber officinale',
  'Ginkgo biloba': 'Ginkgo biloba',
  'Ginseng (Panax ginseng)': 'Panax ginseng',
  'Ginseng africain (Kaempferia aethiopica)': 'Kaempferia aethiopica',
  'Girofle (Syzygium aromaticum)': 'Syzygium aromaticum',
  'Gommier rouge (Bursera simaruba)': 'Bursera simaruba',
  'Goyavier (Psidium guajava)': 'Psidium guajava',
  'Guava (Psidium guajava)': 'Psidium guajava',
  'Gymnema sylvestre': 'Gymnema sylvestre',
  'Harpagophytum procumbens': 'Harpagophytum procumbens',
  'Harpon d\'Afrique (Xylopia aethiopica)': 'Xylopia aethiopica',
  'Harungana madagascariensis': 'Harungana madagascariensis',
  'Hibiscus sabdariffa (bissap)': 'Hibiscus sabdariffa',
  'Kinkeliba (Combretum micranthum)': 'Combretum micranthum',
  'Kinkéliba (Combretum micranthum)': 'Combretum micranthum',
  'Kudzu (Pueraria lobata)': 'Pueraria lobata',
  'Lemon balm (Melissa officinalis)': 'Melissa officinalis',
  'Leonotis leonurus': 'Leonotis leonurus',
  'Lierre (Hedera helix)': 'Hedera helix',
  'Lime (Citrus aurantifolia)': 'Citrus aurantifolia',
  'Linaire (Linaria vulgaris)': 'Linaria vulgaris',
  'Mangifera indica (Manguier)': 'Mangifera indica',
  'Manguier (Mangifera indica)': 'Mangifera indica',
  'Menthe poivrée (Mentha piperita)': 'Mentha piperita',
  'Miel + Citron (Allium sativum)': 'honey garlic medicinal',
  'Millepertuis (Hypericum perforatum)': 'Hypericum perforatum',
  'Moringa oleifera': 'Moringa oleifera',
  'Myrobolan (Terminalia chebula)': 'Terminalia chebula',
  'Myrtille (Vaccinium myrtillus)': 'Vaccinium myrtillus',
  'Mélange Moringa + Soja + Mil': 'Moringa oleifera',
  'Neem (margousier)': 'Azadirachta indica',
  'Nigelle sativa (Nigelle)': 'Nigella sativa',
  'Orthosiphon stamineus (Java tea)': 'Orthosiphon stamineus',
  'Papayer (Carica papaya)': 'Carica papaya',
  'Passiflore (Passiflora incarnata)': 'Passiflora incarnata',
  'Persicaria odorata (Menthe vietnamienne)': 'Persicaria odorata',
  'Phyllanthus amarus': 'Phyllanthus amarus',
  'Phyllanthus niruri': 'Phyllanthus niruri',
  'Pissenlit (Taraxacum officinale)': 'Taraxacum officinale',
  'Psyllium (Plantago ovata)': 'Plantago ovata',
  'Pétrilium (Petroselinum crispum)': 'Petroselinum crispum',
  'Rac commun (Salvadora persica)': 'Salvadora persica',
  'Ricin commun (Ricinus communis)': 'Ricinus communis',
  'Sanglier (Cassia occidentalis)': 'Cassia occidentalis',
  'Sauge (Salvia officinalis)': 'Salvia officinalis',
  'Silybum marianum (Chardon-Marie)': 'Silybum marianum',
  'Séné (Cassia acutifolia)': 'Senna alexandrina',
  'Thym (Thymus vulgaris)': 'Thymus vulgaris',
  'Urtica dioica (Ortie)': 'Urtica dioica',
  'Uva ursi (Arctostaphylos uva-ursi)': 'Arctostaphylos uva-ursi',
  'Valériane (Valeriana officinalis)': 'Valeriana officinalis',
  'Varech (Fucus vesiculosus)': 'Fucus vesiculosus',
  'Vernonia amygdalina (Blake)': 'Vernonia amygdalina',
}

# Charger le mapping maladie -> anglais (fichier optionnel, généré à la main)
ns = {}
try:
    exec(open('/tmp/disease_en.py').read(), ns)
except OSError:
    pass
DISEASE_EN = ns.get('DISEASE_EN', {})

def build_url(plant_key, disease):
    latin = LATIN.get(plant_key, plant_key)
    if not latin:
        return None  # pas de plante -> pas d'URL (ex: eau physiologique)
    disease_en = DISEASE_EN.get(disease, disease)
    term = f"{latin} {disease_en}".strip()
    # On ne cherche que les termes utiles ; enlever le terme générique "medicinal" qui brouille
    return f"https://pubmed.ncbi.nlm.nih.gov/?term={quote_plus(term)}"

def update_treatments():
    data = json.load(open('traditional_treatments.json'))
    treats = data['treatments']
    changed = 0
    for t in treats:
        plant = t['plant']['scientific_name']
        url = build_url(plant, t['disease'])
        if url is None:
            continue
        if t.get('source_url') != url:
            t['source_url'] = url
            changed += 1
    json.dump(data, open('traditional_treatments.json', 'w'), ensure_ascii=False, indent=2)
    print(f'JSON: {changed} URLs mises à jour')

    # Mettre à jour la CSV aussi, si elle a la meme structure
    try:
        with open('traditional_treatments.csv', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            csvrows = list(reader)
        if 'source_url' in csvrows[0]:
            ch = 0
            for r in csvrows:
                # localiser par (disease, plant_name_fr)
                src = next((t for t in treats
                            if t['disease']==r.get('disease')
                            and t['plant']['scientific_name']==r.get('plant_name_fr')), None)
                if src and 'source_url' in r and r['source_url'] != src['source_url']:
                    r['source_url'] = src['source_url']
                    ch += 1
            with open('traditional_treatments.csv','w',newline='',encoding='utf-8') as f:
                w = csv.DictWriter(f, fieldnames=csvrows[0].keys())
                w.writeheader()
                w.writerows(csvrows)
            print(f'CSV: {ch} URLs mises à jour')
    except Exception as e:
        print('CSV skip:', e)

if __name__ == '__main__':
    update_treatments()
