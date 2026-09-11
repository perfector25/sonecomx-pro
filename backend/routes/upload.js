const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { protect, authorize } = require('../middleware/auth');

// Configuration de Cloudinary
if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Utilisation de la mémoire vive pour stocker temporairement les fichiers avant envoi à Cloudinary
const storage = multer.memoryStorage();

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
  limits: { fileSize: 10 * 1024 * 1024 } // limite à 10 Mo par fichier
});

// Helper pour uploader un buffer mémoire vers Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'sonecomx_products',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// Route POST /api/upload
router.post('/', protect, authorize('admin'), (req, res) => {
  upload.array('images', 10)(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Erreur d'upload : ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }

    const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL);

    try {
      if (hasCloudinary) {
        // Envoi vers Cloudinary
        const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
        const fileUrls = await Promise.all(uploadPromises);

        return res.status(200).json({
          success: true,
          message: 'Images hébergées sur Cloudinary avec succès',
          data: fileUrls
        });
      } else {
        // Fallback Base64 Data URI sécurisé si Cloudinary n'est pas encore configuré dans les variables d'environnement
        console.warn('⚠️ Cloudinary non configuré. Utilisation du fallback Base64 Data URI.');
        const fileUrls = req.files.map(file => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`);

        return res.status(200).json({
          success: true,
          message: 'Images converties (Veuillez configurer CLOUDINARY_CLOUD_NAME pour le stockage cloud optimal)',
          data: fileUrls
        });
      }
    } catch (uploadError) {
      console.error('❌ Erreur lors de l\'upload Cloudinary:', uploadError);
      return res.status(500).json({
        success: false,
        message: `Erreur Cloudinary : ${uploadError.message || 'Échec de l\'envoi vers le cloud'}`
      });
    }
  });
});

module.exports = router;
