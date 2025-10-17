const Asset = require('../models/Asset');

// ✅ ADD IMAGE UPLOAD HANDLER
exports.uploadAssetImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
};

// Create Asset - ONLY TENANTS CAN CREATE
exports.createAsset = async (req, res) => {
  try {
    // ✅ CHECK IF USER IS TENANT ONLY
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ 
        success: false, // ✅ Add success field
        message: 'Only tenants can create assets' 
      });
    }

    // ✅ DESTRUCTURE ALL FIELDS INCLUDING IMAGE URL
    const {
      name,
      description,
      category,
      location,
      status,
      value,
      purchaseDate,
      lastMaintenanceDate,
      serialNumber,
      manufacturer,
      model,
      imageUrl
    } = req.body;

    // ✅ VALIDATE REQUIRED FIELDS
    if (!name || !description || !serialNumber || !manufacturer || !model) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, serialNumber, manufacturer, model'
      });
    }

    // ✅ ENSURE ASSET BELONGS TO THE TENANT
    const assetData = {
      name: name.trim(),
      description: description.trim(),
      category,
      location,
      status,
      value: parseFloat(value) || 0,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date(),
      serialNumber: serialNumber.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      imageUrl: imageUrl || null, // ✅ Include image URL
      tenant: req.user._id 
    };

    const asset = await Asset.create(assetData);
    res.status(201).json({
      success: true, // ✅ Add success field for consistency
      data: asset
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get All Assets with Filters - WITH TENANT ISOLATION
exports.getAssets = async (req, res) => {
  try {
    const query = {};
    
    // ✅ TENANT ISOLATION
    if (req.user.role === 'tenant') {
      query.tenant = req.user._id;
    } else if (req.user.role === 'service_provider' || req.user.role === 'customer') {
      query.tenant = req.user.tenant;
    }
    // Admin can see all assets
    
    if (req.query.category) query.category = req.query.category;
    if (req.query.location) query.location = req.query.location;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search)
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
      
    const assets = await Asset.find(query).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, // ✅ Add success field
      assets 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get Asset by ID - WITH TENANT ISOLATION
exports.getAsset = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // ✅ TENANT ISOLATION
    if (req.user.role === 'tenant') {
      query.tenant = req.user._id;
    } else if (req.user.role === 'service_provider' || req.user.role === 'customer') {
      query.tenant = req.user.tenant;
    }
    
    const asset = await Asset.findOne(query);
    if (!asset) {
      return res.status(404).json({ 
        success: false,
        message: 'Asset not found' 
      });
    }
    
    res.json({
      success: true, // ✅ Add success field
      data: asset
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Update Asset - ONLY TENANT CAN UPDATE
exports.updateAsset = async (req, res) => {
  try {
    // ✅ CHECK IF USER IS TENANT
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ 
        success: false,
        message: 'Only tenants can update assets' 
      });
    }

    // ✅ SANITIZE UPDATE DATA
    const updateData = { ...req.body };
    
    // Convert dates if provided
    if (updateData.purchaseDate) {
      updateData.purchaseDate = new Date(updateData.purchaseDate);
    }
    if (updateData.lastMaintenanceDate) {
      updateData.lastMaintenanceDate = new Date(updateData.lastMaintenanceDate);
    }

    // Convert value to number if provided
    if (updateData.value) {
      updateData.value = parseFloat(updateData.value);
    }

    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user._id },
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!asset) {
      return res.status(404).json({ 
        success: false,
        message: 'Asset not found' 
      });
    }

    res.json({
      success: true,
      data: asset
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Delete Asset - ONLY TENANT CAN DELETE
exports.deleteAsset = async (req, res) => {
  try {
    // ✅ CHECK IF USER IS TENANT
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ 
        success: false,
        message: 'Only tenants can delete assets' 
      });
    }

    const asset = await Asset.findOneAndDelete({
      _id: req.params.id, 
      tenant: req.user._id
    });
    
    if (!asset) {
      return res.status(404).json({ 
        success: false,
        message: 'Asset not found' 
      });
    }

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};