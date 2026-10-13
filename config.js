/* =========================================================
   KAMERA MAJLIS — tetapan
   Ini satu-satunya fail yang perlu diubah untuk majlis lain.
   ========================================================= */
window.MAJLIS = {
  // ---- Pasangan & majlis ----
  title: 'Walimatulurus',
  groom: 'Asyraf',
  bride: 'Dhirah',
  dateLabel: 'Disember 2026',     // muka depan & laman utama
  dateShort: '24 · 12 · 2026',    // dicetak pada bingkai gambar
  hijriLabel: 'Rejab 1448',       // kosongkan ('') untuk sembunyi. Sila semak tarikh hijrah.
  monogram: ['D', 'A'],
  hashtag: '#D&AInEveryChapter',
  pantun: [
    'Tiup serunai di atas kota,',
    'Uda memupuk bunga melati;',
    'Mula kenal kemudian bercinta,',
    'Cinta tersemai di dalam hati.'
  ],

  // ---- Backend (Google Apps Script) ----
  // Tampal URL "Web app" dari Apps Script (berakhir dengan /exec).
  // Jika kosong, aplikasi berjalan dalam MOD DEMO: gambar disimpan dalam telefon sahaja.
  APPS_SCRIPT_URL: '',

  // ---- Lagu ----
  // Letak fail lagu di assets/lagu.mp3. Jika tiada, lagu kotak muzik ringkas akan dimainkan.
  music: 'assets/lagu.mp3',
  musicVolume: 0.7,

  // ---- Gambar dari Canva (pilihan) ----
  // Biarkan null untuk guna hiasan terbina. Isi dengan laluan fail PNG/JPG untuk ganti.
  images: {
    cover: null,        // ilustrasi sampul muka depan, cth. 'assets/cover.png'
    coverPhoto: null,   // gambar pasangan dalam sampul (jika guna hiasan terbina)
    homeCollage: null   // kolaj laman utama, cth. 'assets/home.png'
  },

  // Bingkai PNG sendiri dari Canva (1080 x 1440 px, ruang gambar lutsinar).
  // Ruang gambar mesti sama dengan "window" bingkai tersebut — lihat README.
  frameImages: {
    // renda: 'assets/frames/renda.png',
    // emas: 'assets/frames/emas.png',
  }
};
