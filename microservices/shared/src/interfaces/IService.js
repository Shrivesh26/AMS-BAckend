/**
 * Base Service Interface
 * Following Interface Segregation Principle
 */
class IService {
  constructor(repository) {
    if (!repository) {
      throw new Error('Repository is required');
    }
    this.repository = repository;
  }

  async validateData(data) {
    throw new Error('validateData method must be implemented');
  }

  async create(data) {
    throw new Error('create method must be implemented');
  }

  async findById(id) {
    throw new Error('findById method must be implemented');
  }

  async findMany(filter, options) {
    throw new Error('findMany method must be implemented');
  }

  async update(id, data) {
    throw new Error('update method must be implemented');
  }

  async delete(id) {
    throw new Error('delete method must be implemented');
  }
}

module.exports = IService;