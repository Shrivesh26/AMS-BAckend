const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload'); // ✅ Add upload middleware

router.use(protect);

// ✅ ADD IMAGE UPLOAD ROUTE
router.post('/uploads', upload.single('image'), assetController.uploadAssetImage);

router.post('/', authorize('tenant'), assetController.createAsset);

// All authenticated users can view assets (with tenant isolation in controller)
router.get('/', assetController.getAssets);
router.get('/:id', assetController.getAsset);

// ✅ ONLY TENANTS CAN UPDATE/DELETE ASSETS
router.put('/:id', authorize('tenant'), assetController.updateAsset);
router.delete('/:id', authorize('tenant'), assetController.deleteAsset);

module.exports = router;