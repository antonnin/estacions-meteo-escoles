# 🌤️ Estacions Meteorològiques en Xarxa

Web per veure en **temps real** les dades d'estacions meteorològiques construïdes per l'alumnat (micro:bit amb extensió IoT, ESP32, altres plaques) i per **donar-ne d'alta de noves directament des de la pròpia web**. Projecte mentoria 4.0.

- 🗺️ Mapa de Catalunya amb una magnitud a escollir (temperatura, humitat, llum, pressió, vent, pluja, pols).
- 📈 Pàgina d'estació amb gràfics, rangs de dates i exportació a CSV.
- ➕ Alta d'estacions amb formulari + comprovador de canal (`alta.html`).
- 📚 Recursos didàctics (`recursos.html`) i formulari de contacte (`contacte.html`).
- 🗄️ **Històric al full de càlcul de Google**: cada hora s'hi desa la mitjana de cada estació.
- 🔌 Compatible amb qualsevol placa que enviï a **ThingSpeak** (perfils de placa a `js/boards.js`).

## Com funciona

```
Placa (micro:bit / ESP32 / …) ──► ThingSpeak ──► Web (temps real, directe des del navegador)
                                      │
                       Apps Script (cada hora, mitjana horària)
                                      ▼
                         Full de càlcul de Google ──► Web (històric)  +  gràfics propis
                                      ▲
         Google Form (alta) ──► fulla «estacions» ──► aprovació ──► mapa
```

- **Temps real** (fins a 36 h): el navegador llegeix ThingSpeak.
- **Històric** (rangs més llargs): el navegador llegeix el full de càlcul via Apps Script i completa l'últim tram amb ThingSpeak. Si l'Apps Script no respon, usa ThingSpeak amb mitjanes.
- **Sense backend propi**: web estàtica (GitHub Pages) + Google (Form, Fulls, Apps Script).

## Estructura

```
index.html              Portada: mapa + llistat únic d'estacions
estacio.html            Pàgina única d'estació (?id=<id>)
alta.html               Alta d'estacions: perfils, comprovador de canal i formulari
recursos.html           Recursos didàctics: alta, muntatge de la placa i connexió a ThingSpeak
contacte.html           Formulari de contacte (arriba a la fulla «contactes» del full de càlcul)
js/layout.js            Capçalera, menú i peu de pàgina compartits (s'edita en un sol lloc)
js/config.js            Paràmetres globals (URL de l'API, ThingSpeak, mitjanes, gràfiques)
js/boards.js            Tipus de magnitud i perfils de placa (capa de compatibilitat)
js/stations.js          Registre d'estacions (API → còpia local → data/stations.json)
js/thingspeak-service.js  Lectura de ThingSpeak (paginació, mitjanes, escales)
js/history-service.js   Lectura de l'històric (Apps Script)
js/data-source.js       Decideix temps real o històric segons el rang
js/dashboard.js, charts.js, catalonia-map.js, alta.js, demo-data.js, data-storage.js
apps-script/            Backend de Google (Code.gs + guia d'instal·lació)
data/stations.json      Estacions locals (mode local; buit per defecte)
data/recursos.json      Llista de recursos addicionals de la pàgina de recursos
assets/logos/           Logos del peu de pàgina
data/catalunya-map.svg  Mapa base
docs/VALORACIO_ESP32.md Valoració de plaques ESP32
tools/mapa/             Eines per generar el mapa (no es fan servir en execució)
```

## Posada en marxa

### 1. Web (GitHub Pages)
1. Puja aquest repositori a GitHub.
2. **Settings → Pages → Branch: `main`, carpeta `/ (root)`**.
3. La web queda a `https://<usuari>.github.io/<repositori>/`.

Sense res més, funciona en **mode local**: llegeix `data/stations.json` i ThingSpeak, sense històric ni altes.

### 2. Backend de Google (altes + històric)
Segueix [`apps-script/README.md`](apps-script/README.md) (≈ 15 min). Al final enganxes dues URL a `js/config.js`:

```javascript
api: {
    url: 'https://script.google.com/macros/s/…/exec',   // aplicació web d'Apps Script
    formUrl: 'https://docs.google.com/forms/d/e/…/viewform?embedded=true',
},
```

### 3. Desenvolupament local
```bash
npm run serve        # http://localhost:8000
npm run check        # comprova la sintaxi dels JS
```
Afegeix `?demo=true` a qualsevol URL per veure dades simulades (no cal cap canal).

## Donar d'alta una placa (per a l'usuari)

1. Obre **`alta.html`** i tria el tipus de placa.
2. Fes el canal de ThingSpeak **públic** i posa nom als camps.
3. Comprova'l amb el **comprovador** de la mateixa pàgina.
4. Omple el **formulari**. Una persona responsable aprova l'alta i l'estació surt al mapa.

### Perfils de placa

| Perfil | Camps | Notes |
|---|---|---|
| `microbit-iot` | field1 temperatura, 2 humitat, 3 llum (%), 4 pressió, 5 vent | El kit envia el vent en **cm/h**; el web el passa a km/h (`scale: 0.01`). |
| `esp32` | field1–8: temperatura, humitat, llum (lux), pressió, vent (km/h), pluja, pols, senyal Wi-Fi | Mapa estàndard proposat a `docs/VALORACIO_ESP32.md`. |
| `personalitzat` | Es dedueixen dels **noms** dels camps de ThingSpeak | P. ex. «Temperatura», «Humitat», «Pluja». |

**Afegir un perfil nou** (Arduino, Pico W…): afegeix-lo a `PROFILES` a `js/boards.js` (i al desplegable del formulari). Una magnitud nova va a `FIELD_TYPES`.

## Administració (aprovar i mantenir)

- Les altes arriben a la fulla **`estacions`** del full de càlcul amb estat `pendent`. Per publicar-les: canvia `estat` a `aprovada` o fes servir el menú **Estacions Meteorològiques en Xarxa → Aprovar les files seleccionades**.
- Per donar-ne de baixa: posa `rebutjada` (les dades arxivades es conserven).
- Les fulles `d_<id>` contenen l'històric (mitjana horària) i es poden graficar directament amb Fulls de càlcul.
- El correu de contacte **no** surt mai per l'API.

## Editar el contingut

- **Menú, títol, subtítol i peu de pàgina:** `js/layout.js` (un sol lloc per a totes les pàgines).
- **Afegir un recurs didàctic** (enllaç, PDF, vídeo): una entrada nova a `data/recursos.json`. Les guies de la pàgina de recursos són a `recursos.html`.

## Privadesa i seguretat

- Les estacions **no recullen dades personals**.
- Recomanat: canals de ThingSpeak **públics**; així no cal publicar cap clau. Les claus de **lectura** d'un canal privat són visibles per a qualsevol visitant. Les claus d'**escriptura** no han de passar mai per la web ni per aquest repositori.
- No pugis a git cap fitxer amb credencials de les plaques (`secrets.h`, `secrets.py`: ja són a `.gitignore`).

## Mode local i demo

`data/stations.json` està buit a propòsit: el registre real és el full de càlcul. Per desenvolupar sense backend, hi pots afegir estacions amb el mateix format que l'API (`id, name, location, lat, lng, profile, channelId…`). Amb `?demo=true` i sense estacions, la web crea dues estacions de prova.

## Documentació relacionada

- [`apps-script/README.md`](apps-script/README.md) — instal·lació del backend de Google.
- [`docs/VALORACIO_ESP32.md`](docs/VALORACIO_ESP32.md) — valoració de plaques ESP32 i pla de pilot.

## Llicència i crèdits

Pendent d'unificar: el fitxer `LICENSE` diu MIT i el peu de pàgina indica CC BY-NC-ND 4.0. Cal decidir-ne una abans de la publicació.

Fet amb ❤️ per al Projecte mentoria 4.0 a Catalunya. Gràcies a l'alumnat i al professorat participant, a [micro:bit](https://microbit.org/), [ThingSpeak](https://thingspeak.com/) i [Chart.js](https://www.chartjs.org/).
