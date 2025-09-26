const mongoose = require('mongoose');
const IRepository = require('../interfaces/IRepository');

/**
 * Base MongoDB Repository Implementation
 * Following Repository Pattern and Dependency Inversion Principle
 */
class MongoRepository extends IRepository {
  constructor(model) {
    super();
    if (!model) {
      throw new Error('Mongoose model is required');
    }
    this.model = model;
  }

  async create(data, session = null) {
    try {
      const options = session ? { session } : {};
      const document = new this.model(data);
      return await document.save(options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async findById(id, populate = null) {
    try {
      let query = this.model.findById(id);
      if (populate) {
        query = query.populate(populate);
      }
      return await query.exec();
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async findOne(filter, populate = null) {
    try {
      let query = this.model.findOne(filter);
      if (populate) {
        query = query.populate(populate);
      }
      return await query.exec();
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async findMany(filter = {}, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sort = { createdAt: -1 }, 
        populate = null,
        select = null 
      } = options;

      let query = this.model.find(filter);
      
      if (select) {
        query = query.select(select);
      }
      
      if (populate) {
        query = query.populate(populate);
      }
      
      if (sort) {
        query = query.sort(sort);
      }

      // Apply pagination if limit is not -1
      if (limit !== -1) {
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);
      }

      const data = await query.exec();
      const total = await this.count(filter);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: limit === -1 ? 1 : Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async updateById(id, data, session = null) {
    try {
      const options = { 
        new: true, 
        runValidators: true,
        ...(session && { session })
      };
      return await this.model.findByIdAndUpdate(id, data, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async updateOne(filter, data, session = null) {
    try {
      const options = { 
        new: true, 
        runValidators: true,
        ...(session && { session })
      };
      return await this.model.findOneAndUpdate(filter, data, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async deleteById(id, session = null) {
    try {
      const options = session ? { session } : {};
      return await this.model.findByIdAndDelete(id, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async deleteOne(filter, session = null) {
    try {
      const options = session ? { session } : {};
      return await this.model.findOneAndDelete(filter, options);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async exists(filter) {
    try {
      const document = await this.model.findOne(filter).select('_id');
      return !!document;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction(operations) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const result = await operations(session);
      
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw this._handleError(error);
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle and normalize database errors
   */
  _handleError(error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => val.message);
      return new Error(`Validation Error: ${errors.join(', ')}`);
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return new Error(`Duplicate value for field: ${field}`);
    }
    
    if (error.name === 'CastError') {
      return new Error(`Invalid ${error.path}: ${error.value}`);
    }

    return error;
  }
}

module.exports = MongoRepository;