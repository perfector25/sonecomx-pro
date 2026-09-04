const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/auth');

// Configuration du stockage de multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

// Filtre pour s'assurer que seuls les fichiers images sont acceptés
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Seules les images sont autorisées.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // limite à 5 Mo par fichier
});

// Route POST /api/upload
router.post('/', protect, authorize('admin'), (req, res) => {
  upload.array('images', 10)(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Erreur multer (ex: limite de taille dépassée)
      return res.status(400).json({ success: false, message: `Erreur d'upload : ${err.message}` });
    } else if (err) {
      // Autre type d'erreur (ex: filtre de fichier)
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }

    // Récupérer les URLs relatives des fichiers sauvegardés
    const fileUrls = req.files.map(file => `/uploads/${file.filename}`);

    return res.status(200).json({
      success: true,
      message: 'Fichiers enregistrés avec succès',
      data: fileUrls
    });
  });
});

module.exports = router;
