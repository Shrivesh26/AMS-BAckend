const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', assetController.createAsset);
router.get('/', assetController.getAssets);
router.get('/:id', assetController.getAsset);
router.put('/:id', assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);

module.exports = router;