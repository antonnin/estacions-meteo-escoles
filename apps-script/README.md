# Backend d'Estacions Meteorològiques en Xarxa (Google Apps Script)

Aquest script converteix un **full de càlcul de Google** en el «cervell» de la xarxa:

| Funció | Com |
|---|---|
| Alta d'estacions | Un **Google Form** escriu a la fulla `estacions`; l'script valida el canal de ThingSpeak i deixa la fila en estat `pendent`. |
| Aprovació | Una persona responsable canvia `estat` a `aprovada` (o fa servir el menú **Estacions en xarxa → Aprovar les files seleccionades**). |
| Històric | Cada hora l'script copia la mitjana horària de cada estació aprovada a una fulla `d_<id>`. Es pot graficar directament al full. |
| Contacte | El formulari de `contacte.html` envia el missatge a la fulla `contactes` i, si hi ha `ADMIN_EMAIL`, te'l reenvia per correu (pots respondre directament). |
| API per a la web | `?action=stations` (registre) i `?action=history` (històric). Mai exposa el correu de contacte. |

La web només **llegeix** d'aquí; les plaques continuen enviant a ThingSpeak (compatible amb micro:bit i ESP32).

## Instal·lació (≈ 15 minuts)

### 1. Crea el formulari i el full
1. Crea un **Google Form** amb aquestes preguntes (el títol ha de **contenir** el text en negreta; la resta és lliure):

   | Pregunta | Tipus | Obligatòria |
   |---|---|---|
   | **Nom de l'estació** | Text curt | Sí |
   | **Centre educatiu** | Text curt | Sí |
   | **Municipi** | Text curt | Sí |
   | **Comarca** | Text curt | No |
   | **Coordenades (latitud, longitud)** (p. ex. 41.3416, 1.6356) | Text curt | Sí |
   | **Web del centre** | Text curt | No |
   | **Tipus de placa** | Llista: `micro:bit amb kit IoT`, `ESP32`, `Personalitzada` | Sí |
   | **Channel ID** de ThingSpeak | Text curt | Sí |
   | **Read API Key** (només si el canal és privat) | Text curt | No |
   | **Correu de contacte** | Text curt | Sí |
   | Accepto que les dades siguin públiques i que l'estació no recull dades personals | Casella | Sí |

2. A la pestanya **Respostes** del formulari, prem **Enllaça amb Fulls de càlcul** i crea un full nou. Aquest és el full de càlcul del projecte.

### 2. Afegeix l'script
1. Al full de càlcul: **Extensions → Apps Script**.
2. Esborra el contingut i enganxa `apps-script/Code.gs`. Desa.
3. Recarrega el full: apareix el menú **Estacions en xarxa**.
4. Executa **Estacions en xarxa → 1. Configuració inicial** i accepta els permisos. Això crea la fulla `estacions` i els activadors (recollida cada hora i procés del formulari).

### 3. Publica l'API
1. Apps Script → **Desplega → Nova implementació → Aplicació web**.
2. *Executa com*: **Jo**. *Qui hi té accés*: **Qualsevol persona**.
3. Copia la URL (acaba en `/exec`) a `js/config.js` → `CONFIG.api.url`.
4. A **Formulari → Envia → `< >` Incrusta**, copia la URL del formulari i posa-la a `CONFIG.api.formUrl` (afegeix `?embedded=true` si no hi és).

### 4. Prova-ho
- `https://…/exec?action=ping` ha de respondre `{"ok":true,…}`.
- Fes una alta de prova des de `alta.html`, canvia l'estat a `aprovada` i executa **Estacions en xarxa → Recollir dades ara**: apareixerà una fulla `d_<id>` amb dades.

## Fulla `estacions`

`id, name, location, comarca, lat, lng, website, profile, channelId, readApiKey, fields, estat, contacte, dataAlta, ultimaRecollida, notes`

- `estat`: `pendent` → `aprovada` (visible a la web) o `rebutjada`. `error` = canal no validat (mira `notes`).
- `profile`: `microbit-iot`, `esp32` o `personalitzat` (vegeu `js/boards.js`).
- `fields`: només perfil personalitzat; JSON amb el tipus de cada camp detectat pels noms de ThingSpeak. Es pot editar a mà.
- `contacte` i `notes` **no** surten mai per l'API.

## Dades i límits

- Una fulla per estació amb la mitjana horària: unes 8.800 files/any (el límit d'un full és de 10 milions de cel·les).
- `ARCHIVE_FROM` (Propietats de l'script) fixa des de quan s'arxiva en donar d'alta una estació (per defecte `2025-01-01`).
- `ADMIN_EMAIL` (Propietats de l'script, opcional): rep un correu a cada alta i a cada missatge de contacte.
- L'script s'atura als 4,5 min i continua l'hora següent; amb centenars d'estacions caldria partir-lo.
- Si canvies el codi i fas servir el formulari de contacte, **redesplega** com a nova versió (la URL no canvia).
- Cap clau d'**escriptura** passa mai per aquí. Les claus de lectura només es publiquen si el canal és privat.

## Mantenir-lo
- Si canvies `Code.gs`, **Desplega → Gestiona implementacions → Edita → Nova versió** (la URL no canvia).
- Fes còpia del full de càlcul de tant en tant (**Fitxer → Fes una còpia**): és l'únic arxiu de l'històric.
