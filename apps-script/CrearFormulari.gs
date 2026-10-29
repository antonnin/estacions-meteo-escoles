/**
 * Estacions Meteorològiques en Xarxa — Creació automàtica del formulari d'alta
 *
 * COM USAR-LO
 * 1. Ves a https://script.google.com i crea un projecte nou (Nou projecte).
 * 2. Esborra el contingut i enganxa aquest fitxer sencer. Desa.
 * 3. Selecciona la funció `crearFormulari` i prem Executa. Accepta els permisos.
 * 4. Mira el Registre d'execució: hi trobaràs
 *      - la URL d'edició del formulari,
 *      - la URL per incrustar (→ CONFIG.api.formUrl a js/config.js),
 *      - la URL del full de càlcul (on has d'enganxar després Code.gs).
 *
 * Els títols de les preguntes contenen els textos que Code.gs reconeix
 * («Nom de l'estació», «Centre educatiu», «Municipi», «Comarca», «Coordenades»,
 * «Web del centre», «Tipus de placa», «Channel ID», «Read API Key»,
 * «Correu de contacte»). No els canviïs sense actualitzar Code.gs.
 */
function crearFormulari() {
  var form = FormApp.create('Alta d\'una estació meteorològica a la xarxa');
  form.setDescription(
    'Dona d\'alta la teva estació perquè aparegui al mapa d\'Estacions Meteorològiques en Xarxa.\n\n' +
    'Abans d\'omplir-lo, comprova que la teva placa ja envia dades a un canal de ThingSpeak ' +
    '(pots verificar-ho a la pàgina «Afegeix la teva placa»). ' +
    'Un cop validada, l\'estació serà visible a la web.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(true);
  form.setConfirmationMessage('Gràcies! Hem rebut l\'alta. Revisarem l\'estació i apareixerà al mapa quan sigui aprovada.');

  var numero = FormApp.createTextValidation()
    .setHelpText('Introdueix un número (p. ex. 41.3416).')
    .requireNumber()
    .build();
  var coordenades = FormApp.createTextValidation()
    .setHelpText('Format: latitud, longitud (p. ex. 41.3416, 1.6356).')
    .requireTextMatchesPattern('^\\s*-?\\d{1,2}(\\.\\d+)?\\s*,\\s*-?\\d{1,3}(\\.\\d+)?\\s*$')
    .build();
  var enter = FormApp.createTextValidation()
    .setHelpText('Introdueix només el número del canal.')
    .requireWholeNumber()
    .build();
  var correu = FormApp.createTextValidation()
    .setHelpText('Introdueix un correu electrònic vàlid.')
    .requireTextIsEmail()
    .build();

  // --- Dades de l'estació ---
  form.addSectionHeaderItem().setTitle('Dades de l\'estació');

  form.addTextItem().setTitle('Nom de l\'estació').setRequired(true);
  form.addTextItem().setTitle('Centre educatiu').setRequired(true);
  form.addTextItem().setTitle('Municipi').setRequired(true);
  form.addTextItem().setTitle('Comarca').setRequired(false);

  form.addTextItem()
    .setTitle('Coordenades (latitud, longitud)')
    .setHelpText('Fes clic dret sobre el punt a Google Maps, clica els números que apareixen i enganxa\'ls tal qual. Exemple: 41.3416, 1.6356')
    .setValidation(coordenades)
    .setRequired(true);

  form.addTextItem()
    .setTitle('Web del centre')
    .setHelpText('Opcional. Adreça completa, p. ex. https://www.elmeucentre.cat')
    .setRequired(false);

  // --- Placa i ThingSpeak ---
  form.addSectionHeaderItem().setTitle('Placa i canal de ThingSpeak');

  form.addMultipleChoiceItem()
    .setTitle('Tipus de placa')
    .setChoiceValues(['micro:bit amb kit IoT', 'ESP32', 'Personalitzada'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Channel ID de ThingSpeak')
    .setHelpText('Número del canal (el trobaràs a ThingSpeak → Channels → My Channels).')
    .setValidation(enter)
    .setRequired(true);

  form.addTextItem()
    .setTitle('Read API Key (només si el canal és privat)')
    .setHelpText('Deixa-ho en blanc si el canal és públic. Mai no posis aquí la clau d\'ESCRIPTURA (Write API Key).')
    .setRequired(false);

  // --- Contacte i consentiment ---
  form.addSectionHeaderItem().setTitle('Contacte i consentiment');

  form.addTextItem()
    .setTitle('Correu de contacte')
    .setHelpText('Només l\'utilitzarem per comunicar-nos amb tu sobre l\'estació. No es publica.')
    .setValidation(correu)
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Accepto que les dades siguin públiques i que l\'estació no recull dades personals')
    .setChoiceValues(['Sí, ho accepto'])
    .setRequired(true);

  // --- Full de càlcul de respostes ---
  var ss = SpreadsheetApp.create('Estacions Meteorològiques en Xarxa — dades');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  var embed = form.getPublishedUrl().replace(/\/viewform.*$/, '/viewform') + '?embedded=true';

  Logger.log('FORMULARI (edició):        ' + form.getEditUrl());
  Logger.log('FORMULARI (URL pública):   ' + form.getPublishedUrl());
  Logger.log('→ CONFIG.api.formUrl:      ' + embed);
  Logger.log('FULL DE CÀLCUL:            ' + ss.getUrl());
  Logger.log('Següent pas: obre el full → Extensions → Apps Script → enganxa Code.gs.');
}
