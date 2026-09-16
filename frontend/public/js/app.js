/* Research-to-Mastery — client MVP
 * The product layer is intentionally isolated from the existing commerce API.
 * Replace MockResearchData with API adapters when the research backend is ready.
 */

const MockResearchData = {
  suggestions: ['Batteries solaires au Cameroun', 'Méthodes de recherche documentaire', 'Sécurité des chantiers'],
  featured: [
    { title: 'Batteries solaires au Cameroun', meta: '12 sources · 8 min de synthèse', icon: 'ti-solar-electricity' },
    { title: 'Sécurité des chantiers', meta: '9 sources · 6 min de synthèse', icon: 'ti-shield-check' },
    { title: 'Méthodes de recherche documentaire', meta: '7 sources · 5 min de synthèse', icon: 'ti-notebook' }
  ],
  research: {
    title: 'Batteries solaires au Cameroun',
    summary: 'Les batteries lithium-fer-phosphate (LiFePO4) gagnent du terrain pour les installations solaires résidentielles et professionnelles au Cameroun. Leur durée de vie, leur profondeur de décharge et la baisse progressive des coûts les rendent adaptées aux usages hors réseau.',
    keyPoints: [
      'Le dimensionnement doit partir de la consommation quotidienne et de l’autonomie souhaitée.',
      'Les batteries LiFePO4 offrent généralement plus de cycles que les batteries plomb-acide.',
      'La température, la ventilation et la qualité du système de gestion (BMS) influencent la durée de vie.',
      'Un suivi de tension et de capacité permet de repérer tôt une baisse de performance.'
    ],
    sources: [
      { title: 'IRENA — Electricity storage and renewables', domain: 'irena.org', type: 'Rapport institutionnel', year: '2024', color: 'blue' },
      { title: 'IEA — Batteries and secure energy transitions', domain: 'iea.org', type: 'Analyse sectorielle', year: '2024', color: 'orange' },
      { title: 'AFREC — Renewable energy in Africa', domain: 'afrec.org', type: 'Données régionales', year: '2023', color: 'green' }
    ]
  },
  course: {
    title: 'Dimensionner une batterie solaire',
    subtitle: 'Un parcours pratique pour passer de la recherche à la décision.',
    lessons: [
      { title: 'Comprendre les besoins', duration: '6 min', done: true, icon: 'ti-bulb' },
      { title: 'Choisir la technologie', duration: '8 min', done: false, icon: 'ti-battery-4' },
      { title: 'Calculer l’autonomie', duration: '10 min', done: false, icon: 'ti-calculator' },
      { title: 'Vérifier son installation', duration: '7 min', done: false, icon: 'ti-checkbox' }
    ]
  },
  quiz: [
    { question: 'Quel élément doit guider le dimensionnement initial ?', options: ['La couleur des panneaux', 'La consommation quotidienne', 'Le nombre de prises', 'La marque du convertisseur'], answer: 1 },
    { question: 'Quel avantage caractérise souvent le LiFePO4 ?', options: ['Aucun entretien électrique', 'Une durée de vie cyclique élevée', 'Un poids toujours nul', 'Une charge instantanée'], answer: 1 },
    { question: 'Quel composant protège et surveille les cellules ?', options: ['Le BMS', 'Le disjoncteur général', 'Le compteur d’eau', 'Le thermostat mural'], answer: 0 }
  ]
};

const AppState = {
  route: location.hash.slice(1) || 'home',
  query: '',
  research: MockResearchData.research,
  courseProgress: Number(localStorage.getItem('rtm_course_progress') || 25),
  quizScore: Number(localStorage.getItem('rtm_quiz_score') || 0),
  quizIndex: 0,
  quizAnswers: [],
  loading: false,
  error: ''
};

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

const Icons = {
  icon(name) { return `<i class="ti ${name}" aria-hidden="true"></i>`; },
  arrow() { return this.icon('ti-arrow-right'); }
};

function navigate(route) {
  if (location.hash.slice(1) === route) render();
  else location.hash = route;
}

function progressRing(value, label = `${value}%`) {
  return `<div class="progress-ring" style="--progress:${value * 3.6}deg" aria-label="${label}">${label}</div>`;
}

function shell(content) {
  return `
    <div class="app-shell">
      <a class="skip-link" href="#main-content">Aller au contenu principal</a>
      <header class="app-header">
        <a class="brand" href="#home" aria-label="Research to Mastery — accueil">
          <span class="brand-mark">${Icons.icon('ti-sparkles')}</span>
          <span><strong>Research</strong><b>to Mastery</b></span>
        </a>
        <nav class="main-nav" aria-label="Navigation principale">
          <a href="#home" class="${AppState.route === 'home' ? 'active' : ''}">Accueil</a>
          <a href="#research" class="${['research', 'results'].includes(AppState.route) ? 'active' : ''}">Rechercher</a>
          <a href="#course" class="${['course', 'quiz'].includes(AppState.route) ? 'active' : ''}">Apprendre</a>
          <a href="#progress" class="${AppState.route === 'progress' ? 'active' : ''}">Progression</a>
        </nav>
        <div class="header-actions">
          <button class="icon-button" aria-label="Notifications">${Icons.icon('ti-bell')}</button>
          <button class="avatar" aria-label="Profil de Amina">AM</button>
        </div>
      </header>
      <main id="main-content" class="page-content">${content}</main>
      <nav class="mobile-nav" aria-label="Navigation mobile">
        <a href="#home">${Icons.icon('ti-home')}<span>Accueil</span></a>
        <a href="#research">${Icons.icon('ti-search')}<span>Rechercher</span></a>
        <a href="#course">${Icons.icon('ti-school')}<span>Apprendre</span></a>
        <a href="#progress">${Icons.icon('ti-chart-dots-3')}<span>Ma progression</span></a>
      </nav>
    </div>`;
}

function homePage() {
  const firstName = 'Amina';
  return shell(`
    <section class="home-hero">
      <div class="hero-copy">
        <p class="eyebrow">LA RECHERCHE QUI DEVIENT SAVOIR</p>
        <h1>Des questions<br><span>aux vrais déclics.</span></h1>
        <p class="lead">Research to Mastery transforme une question complexe en synthèse claire, sources vérifiables et parcours d’apprentissage actionnable.</p>
        <div class="hero-actions"><button class="primary-button large" data-action="new-research">${Icons.icon('ti-sparkles')} Explorer un sujet ${Icons.arrow()}</button><a class="hero-link" href="#results">Voir un exemple ${Icons.arrow()}</a></div>
      </div>
      <div class="hero-visual" aria-label="Visualisation d’un parcours de recherche et d’apprentissage">
        <div class="orb orb-main"><span>${Icons.icon('ti-brain')}</span></div><div class="orb orb-small orb-one">${Icons.icon('ti-file-text')}</div><div class="orb orb-small orb-two">${Icons.icon('ti-school')}</div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
        <div class="insight-card"><span>${Icons.icon('ti-sparkles')} Synthèse prête</span><strong>94%</strong><small>3 sources vérifiées · 8 min</small><div class="mini-chart"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
      </div>
    </section>
    <section class="trust-row"><span>VOTRE ESPACE DE SAVOIR</span><b>${Icons.icon('ti-search')} Recherche</b><b>${Icons.icon('ti-books')} Sources</b><b>${Icons.icon('ti-notebook')} Synthèse</b><b>${Icons.icon('ti-school')} Maîtrise</b></section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">VOTRE ESPACE</p><h2>Tout ce qu’il faut pour apprendre mieux</h2></div><a href="#progress" class="text-button">Voir ma progression ${Icons.arrow()}</a></div>
      <div class="metric-grid">
        <article class="metric-card"><span class="metric-icon purple">${Icons.icon('ti-search')}</span><div><strong>Recherche guidée</strong><span>Une question, un angle clair, un résultat exploitable.</span></div>${Icons.arrow()}</article>
        <article class="metric-card"><span class="metric-icon peach">${Icons.icon('ti-book-2')}</span><div><strong>Sources en contexte</strong><span>Chaque idée importante renvoie à une référence.</span></div>${Icons.arrow()}</article>
        <article class="metric-card"><span class="metric-icon mint">${Icons.icon('ti-flame')}</span><div><strong>Apprentissage actif</strong><span>Un cours court et un quiz pour ancrer les acquis.</span></div>${Icons.arrow()}</article>
      </div>
    </section>
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">RÉCEMMENT EXPLORÉ</p><h2>Reprendre là où vous étiez</h2></div></div>
      <div class="topic-grid">${MockResearchData.featured.map((item, index) => `<button class="topic-card" data-action="open-result" data-index="${index}"><span class="topic-icon">${Icons.icon(item.icon)}</span><span><strong>${esc(item.title)}</strong><small>${item.meta}</small></span>${Icons.arrow()}</button>`).join('')}</div>
    </section>
    <section class="dark-cta"><div class="dark-cta-icon">${Icons.icon('ti-sparkles')}</div><div><strong>Prêt à transformer votre prochaine question ?</strong><p>Lancez une recherche et construisez votre prochain parcours de maîtrise.</p></div><button class="primary-button" data-action="new-research">Commencer maintenant ${Icons.arrow()}</button></section>
  `);
}

function researchPage() {
  return shell(`
    <div class="narrow-page">
      <div class="page-intro"><p class="eyebrow">NOUVELLE RECHERCHE</p><h1>Quelle question voulez-vous éclairer ?</h1><p>Décrivez un sujet, un problème ou une décision. Vous obtiendrez une synthèse structurée et des sources à explorer.</p></div>
      <form class="research-form" id="research-form">
        <label for="research-query">Votre question</label>
        <textarea id="research-query" name="query" rows="4" placeholder="Ex. Comment choisir une batterie solaire pour une petite entreprise ?">${esc(AppState.query)}</textarea>
        <div class="form-footer"><span>${Icons.icon('ti-info-circle')} La recherche IA n'est pas encore connectée. Mode démonstration actif.</span><button class="primary-button" type="submit">${Icons.icon('ti-search')} Lancer la recherche</button></div>
      </form>
      <div class="suggestion-box"><p>Essayez un exemple</p><div>${MockResearchData.suggestions.map(s => `<button class="suggestion" data-query="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
      ${AppState.error ? `<div class="error-state">${Icons.icon('ti-alert-circle')} ${esc(AppState.error)}</div>` : ''}
    </div>
  `);
}

function loadingPage() {
  return shell(`<div class="loading-state"><div class="loader"></div><h1>Nous préparons votre synthèse</h1><p>Recherche des points clés et organisation des sources…</p></div>`);
}

function resultsPage() {
  const data = AppState.research;
  return shell(`
    <div class="results-layout">
      <div class="results-main">
        <div class="breadcrumbs"><a href="#home">Accueil</a><span>/</span><a href="#research">Recherche</a><span>/</span><strong>Synthèse</strong></div>
        <div class="result-heading"><div><p class="eyebrow">SYNTHÈSE · 8 MIN DE LECTURE</p><h1>${esc(data.title)}</h1><p class="muted">Mise à jour il y a quelques secondes · 3 sources analysées</p></div><button class="icon-button bordered" aria-label="Enregistrer">${Icons.icon('ti-bookmark')}</button></div>
        <div class="summary-card"><div class="summary-label">${Icons.icon('ti-sparkles')} EN BREF</div><p>${esc(data.summary)}</p></div>
        <section class="result-section"><div class="section-heading"><div><p class="eyebrow">À RETENIR</p><h2>Les points essentiels</h2></div></div><div class="key-points">${data.keyPoints.map((point, i) => `<div class="key-point"><span>${i + 1}</span><p>${esc(point)}</p></div>`).join('')}</div></section>
        <section class="result-section"><div class="section-heading"><div><p class="eyebrow">POUR ALLER PLUS LOIN</p><h2>Apprendre ce sujet</h2></div></div><div class="course-cta"><div class="course-visual">${Icons.icon('ti-school')}</div><div><span class="tag">PARCOURS GUIDÉ · 31 MIN</span><h3>Dimensionner une batterie solaire</h3><p>4 leçons courtes, un exemple concret et un quiz pour vérifier vos acquis.</p></div><button class="primary-button" data-action="start-course">Commencer ${Icons.arrow()}</button></div></section>
      </div>
      <aside class="sources-panel"><div class="sources-header"><div><p class="eyebrow">SOURCES</p><h2>Références utilisées</h2></div><span class="source-count">3</span></div><p class="muted">Chaque point est relié à une source vérifiable.</p><div class="source-list">${data.sources.map((source, i) => `<a class="source-item" href="#" onclick="return false"><span class="source-number ${source.color}">${i + 1}</span><span><strong>${esc(source.title)}</strong><small>${source.domain} · ${source.type} · ${source.year}</small></span>${Icons.icon('ti-external-link')}</a>`).join('')}</div><button class="outline-button full" data-action="new-research">${Icons.icon('ti-refresh')} Nouvelle recherche</button></aside>
    </div>
  `);
}

function coursePage() {
  const course = MockResearchData.course;
  return shell(`
    <div class="course-layout">
      <div class="course-main"><div class="breadcrumbs"><a href="#results">Synthèse</a><span>/</span><strong>Cours</strong></div><p class="eyebrow">PARCOURS GUIDÉ · LEÇON 2 SUR 4</p><h1>${esc(course.title)}</h1><p class="lead">${esc(course.subtitle)}</p><div class="lesson-card"><div class="video-placeholder">${Icons.icon('ti-player-play')}<span>Lecture audio et visuelle</span><small>8:24</small></div><h2>Choisir la bonne technologie</h2><p>La technologie de stockage dépend de votre budget, de la fréquence des cycles et des conditions d'installation. Comparez les critères avant de choisir.</p><div class="callout">${Icons.icon('ti-bulb')} <span><strong>À retenir</strong><br>Le LiFePO4 est souvent pertinent lorsque la durée de vie et la profondeur de décharge sont prioritaires.</span></div><button class="primary-button" data-action="take-quiz">Terminer la leçon et faire le quiz ${Icons.arrow()}</button></div></div>
      <aside class="lesson-sidebar"><div class="course-progress-head"><span>Votre progression</span><strong>${AppState.courseProgress}%</strong></div><div class="progress-bar"><span style="width:${AppState.courseProgress}%"></span></div><div class="lesson-list">${course.lessons.map((lesson, i) => `<button class="lesson-item ${i === 1 ? 'current' : ''} ${lesson.done ? 'done' : ''}" ${i === 1 ? '' : 'disabled'}><span class="lesson-number">${lesson.done ? Icons.icon('ti-check') : i + 1}</span><span><strong>${lesson.title}</strong><small>${lesson.duration}</small></span>${lesson.done ? Icons.icon('ti-circle-check-filled') : ''}</button>`).join('')}</div></aside>
    </div>
  `);
}

function quizPage() {
  const item = MockResearchData.quiz[AppState.quizIndex];
  const answered = AppState.quizAnswers[AppState.quizIndex];
  return shell(`
    <div class="quiz-page"><div class="quiz-top"><a href="#course" class="text-button">${Icons.icon('ti-arrow-left')} Retour au cours</a><span>Question ${AppState.quizIndex + 1} sur ${MockResearchData.quiz.length}</span></div><div class="quiz-progress"><span style="width:${((AppState.quizIndex) / MockResearchData.quiz.length) * 100}%"></span></div><div class="quiz-card"><p class="eyebrow">VÉRIFIEZ VOS ACQUIS</p><h1>${esc(item.question)}</h1><div class="quiz-options">${item.options.map((option, i) => `<button class="quiz-option ${answered === i ? (i === item.answer ? 'correct' : 'incorrect') : ''}" data-answer="${i}"><span>${String.fromCharCode(65 + i)}</span>${esc(option)}${answered === i ? Icons.icon(i === item.answer ? 'ti-check' : 'ti-x') : ''}</button>`).join('')}</div>${answered !== undefined ? `<div class="quiz-feedback ${answered === item.answer ? 'success' : 'error'}">${Icons.icon(answered === item.answer ? 'ti-check' : 'ti-info-circle')} ${answered === item.answer ? 'Bonne réponse !' : `La bonne réponse est « ${esc(item.options[item.answer])} ».`}</div><button class="primary-button" data-action="next-question">${AppState.quizIndex === MockResearchData.quiz.length - 1 ? 'Voir mon résultat' : 'Question suivante'} ${Icons.arrow()}</button>` : '<p class="quiz-hint">Sélectionnez une réponse pour continuer.</p>'}</div></div>
  `);
}

function progressPage() {
  return shell(`
    <div class="narrow-page"><div class="page-intro"><p class="eyebrow">VOTRE PROGRESSION</p><h1>Apprendre devient une habitude.</h1><p>Visualisez vos recherches, vos cours et les prochaines étapes pour garder votre élan.</p></div><div class="progress-hero"><div>${progressRing(68, '68%')}<span>objectif mensuel</span></div><div><p class="eyebrow">CETTE SEMAINE</p><h2>Vous êtes sur la bonne voie</h2><p>3 jours d'apprentissage sur les 5 recommandés.</p><div class="week-dots">${['L','M','M','J','V','S','D'].map((day, i) => `<span class="${i < 5 ? 'active' : ''}">${day}</span>`).join('')}</div></div></div><div class="progress-section-grid"><article class="progress-panel"><div class="panel-title"><h2>Parcours en cours</h2><span>1</span></div><div class="progress-course"><span class="topic-icon">${Icons.icon('ti-battery-4')}</span><div><strong>Dimensionner une batterie solaire</strong><small>1 leçon restante · ${AppState.courseProgress}% terminé</small><div class="progress-bar"><span style="width:${AppState.courseProgress}%"></span></div></div><button class="icon-button" data-action="continue-course" aria-label="Continuer">${Icons.arrow()}</button></div></article><article class="progress-panel"><div class="panel-title"><h2>Acquis récents</h2><span>3</span></div><div class="achievement"><span class="achievement-icon">${Icons.icon('ti-rosette-discount-check')}</span><div><strong>Première synthèse</strong><small>Vous avez exploré votre premier sujet</small></div></div><div class="achievement"><span class="achievement-icon">${Icons.icon('ti-flame')}</span><div><strong>Une semaine régulière</strong><small>7 jours de suite</small></div></div></article></div></div>
  `);
}

function render() {
  AppState.route = location.hash.slice(1) || 'home';
  const content = AppState.loading ? loadingPage() : ({
    home: homePage, research: researchPage, results: resultsPage, course: coursePage, quiz: quizPage, progress: progressPage
  }[AppState.route] || homePage)();
  document.body.innerHTML = content;
  bindEvents();
}

function bindEvents() {
  $('#research-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('query').trim();
    if (!query) { AppState.error = 'Saisissez une question pour lancer la recherche.'; render(); return; }
    AppState.error = ''; AppState.query = query; AppState.loading = true; render();
    setTimeout(() => { AppState.loading = false; AppState.research = { ...MockResearchData.research, title: query }; navigate('results'); }, 850);
  });
  document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => { AppState.query = button.dataset.query; render(); $('#research-query')?.focus(); }));
  document.querySelectorAll('[data-action="new-research"]').forEach((button) => button.addEventListener('click', () => navigate('research')));
  document.querySelectorAll('[data-action="open-result"]').forEach((button) => button.addEventListener('click', () => { AppState.research = { ...MockResearchData.research, title: MockResearchData.featured[button.dataset.index].title }; navigate('results'); }));
  document.querySelectorAll('[data-action="start-course"], [data-action="continue-course"]').forEach((button) => button.addEventListener('click', () => navigate('course')));
  document.querySelectorAll('[data-action="take-quiz"]').forEach((button) => button.addEventListener('click', () => { AppState.courseProgress = 50; localStorage.setItem('rtm_course_progress', '50'); navigate('quiz'); }));
  document.querySelectorAll('[data-action="next-question"]').forEach((button) => button.addEventListener('click', () => { if (AppState.quizIndex < MockResearchData.quiz.length - 1) { AppState.quizIndex += 1; render(); } else { AppState.quizScore = AppState.quizAnswers.filter((answer, i) => answer === MockResearchData.quiz[i].answer).length; localStorage.setItem('rtm_quiz_score', String(AppState.quizScore)); AppState.courseProgress = 100; localStorage.setItem('rtm_course_progress', '100'); navigate('progress'); } }));
  document.querySelectorAll('.quiz-option').forEach((button) => button.addEventListener('click', () => { if (AppState.quizAnswers[AppState.quizIndex] !== undefined) return; AppState.quizAnswers[AppState.quizIndex] = Number(button.dataset.answer); render(); }));
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);
