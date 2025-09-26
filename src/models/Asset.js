const mongoose = require('mongoose');
const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  location: String,
  status: String,
  value: Number,
  purchaseDate: Date,
  lastMaintenanceDate: Date,
  imageUrl: String,
  serialNumber: String,
  manufacturer: String,
  model: String,
  // Optionally: createdBy, updatedBy (for audit)
}, { timestamps: true });
module.exports = mongoose.model('Asset', assetSchema);