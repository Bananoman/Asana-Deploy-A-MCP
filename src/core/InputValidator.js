/**
 * Input Validation & Sanitization
 * Enterprise-grade input validation using Joi
 * Prevents injection attacks and ensures data integrity
 *
 * @module InputValidator
 */

const Joi = require('joi');

/**
 * Common validation schemas
 */
const schemas = {
  // GID validation (Asana GIDs are numeric strings)
  gid: Joi.string().pattern(/^\d+$/).required(),

  // Optional GID
  gidOptional: Joi.string().pattern(/^\d+$/).optional(),

  // Email validation
  email: Joi.string().email().required(),

  // URL validation
  url: Joi.string().uri().required(),

  // Date validation (YYYY-MM-DD)
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),

  // Limit validation (pagination)
  limit: Joi.number().integer().min(1).max(100).default(20),

  // Offset validation (pagination)
  offset: Joi.number().integer().min(0).default(0),

  // Name validation (no special chars for security)
  name: Joi.string().min(1).max(1024).pattern(/^[a-zA-Z0-9\s\-_.,!?'"()]+$/).required(),

  // Notes/description (allow more chars but sanitize)
  notes: Joi.string().max(65536).optional(),

  // Workspace GID
  workspace: Joi.string().pattern(/^\d+$/).required(),

  // Project GID
  project: Joi.string().pattern(/^\d+$/).required(),

  // Task GID
  task: Joi.string().pattern(/^\d+$/).required(),

  // Boolean
  boolean: Joi.boolean().optional(),

  // ISO date
  isoDate: Joi.date().iso().optional(),

  // Enum validation
  enum: (values) => Joi.string().valid(...values).required()
};

/**
 * Input Validator class
 */
class InputValidator {
  /**
   * Validate task creation input
   * @param {Object} input - Task data
   * @returns {Object} Validated and sanitized data
   * @throws {Error} Validation error
   */
  static validateCreateTask(input) {
    const schema = Joi.object({
      workspace: schemas.workspace,
      name: schemas.name,
      notes: schemas.notes,
      assignee: schemas.gidOptional,
      projects: Joi.array().items(schemas.gid).optional(),
      due_on: schemas.date.optional(),
      due_at: schemas.isoDate,
      start_on: schemas.date.optional(),
      completed: schemas.boolean,
      liked: schemas.boolean,
      parent: schemas.gidOptional
    }).options({ stripUnknown: true }); // Remove unknown fields for security

    const { error, value } = schema.validate(input);
    if (error) {
      throw new Error(`Validation failed: ${error.details[0].message}`);
    }

    return this.sanitize(value);
  }

  /**
   * Validate task update input
   * @param {Object} input - Update data
   * @returns {Object} Validated and sanitized data
   */
  static validateUpdateTask(input) {
    const schema = Joi.object({
      name: schemas.name.optional(),
      notes: schemas.notes,
      assignee: schemas.gidOptional,
      due_on: schemas.date.optional(),
      due_at: schemas.isoDate,
      start_on: schemas.date.optional(),
      completed: schemas.boolean,
      liked: schemas.boolean
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(input);
    if (error) {
      throw new Error(`Validation failed: ${error.details[0].message}`);
    }

    return this.sanitize(value);
  }

  /**
   * Validate project creation input
   * @param {Object} input - Project data
   * @returns {Object} Validated and sanitized data
   */
  static validateCreateProject(input) {
    const schema = Joi.object({
      workspace: schemas.workspace,
      name: schemas.name,
      notes: schemas.notes,
      team: schemas.gidOptional,
      owner: schemas.gidOptional,
      due_on: schemas.date.optional(),
      start_on: schemas.date.optional(),
      archived: schemas.boolean,
      public: schemas.boolean,
      color: schemas.enum(['dark-pink', 'dark-green', 'dark-blue', 'dark-red', 'dark-teal',
                           'dark-brown', 'dark-orange', 'dark-purple', 'dark-warm-gray',
                           'light-pink', 'light-green', 'light-blue', 'light-red', 'light-teal',
                           'light-brown', 'light-orange', 'light-purple', 'light-warm-gray']).optional()
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(input);
    if (error) {
      throw new Error(`Validation failed: ${error.details[0].message}`);
    }

    return this.sanitize(value);
  }

  /**
   * Validate workspace GID
   * @param {string} gid - Workspace GID
   * @returns {string} Validated GID
   */
  static validateWorkspaceGid(gid) {
    const { error, value } = schemas.workspace.validate(gid);
    if (error) {
      throw new Error(`Invalid workspace GID: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate project GID
   * @param {string} gid - Project GID
   * @returns {string} Validated GID
   */
  static validateProjectGid(gid) {
    const { error, value } = schemas.project.validate(gid);
    if (error) {
      throw new Error(`Invalid project GID: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate task GID
   * @param {string} gid - Task GID
   * @returns {string} Validated GID
   */
  static validateTaskGid(gid) {
    const { error, value } = schemas.task.validate(gid);
    if (error) {
      throw new Error(`Invalid task GID: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * Validate pagination parameters
   * @param {Object} params - Pagination params
   * @returns {Object} Validated params
   */
  static validatePagination(params = {}) {
    const schema = Joi.object({
      limit: schemas.limit,
      offset: schemas.offset
    });

    const { error, value } = schema.validate(params);
    if (error) {
      throw new Error(`Pagination validation failed: ${error.details[0].message}`);
    }

    return value;
  }

  /**
   * Validate bulk operation input
   * @param {Array} items - Items to validate
   * @param {Function} itemSchema - Schema for each item
   * @returns {Array} Validated items
   */
  static validateBulkOperation(items, itemSchema) {
    if (!Array.isArray(items)) {
      throw new Error('Bulk operation input must be an array');
    }

    if (items.length === 0) {
      throw new Error('Bulk operation requires at least one item');
    }

    if (items.length > 100) {
      throw new Error('Bulk operation limited to 100 items per request');
    }

    return items.map((item, index) => {
      const { error, value } = itemSchema.validate(item);
      if (error) {
        throw new Error(`Item ${index} validation failed: ${error.details[0].message}`);
      }
      return this.sanitize(value);
    });
  }

  /**
   * Sanitize input to prevent injection attacks
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  static sanitize(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Sanitize strings
      if (typeof value === 'string') {
        // Remove null bytes
        let clean = value.replace(/\0/g, '');

        // Trim whitespace
        clean = clean.trim();

        // For notes/descriptions, allow HTML but escape dangerous chars
        if (key === 'notes' || key === 'description') {
          // Basic HTML sanitization (allow safe tags)
          clean = this.sanitizeHtml(clean);
        }

        sanitized[key] = clean;
      }
      // Recursively sanitize objects
      else if (typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value);
      }
      // Sanitize arrays
      else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'object' ? this.sanitize(item) : item
        );
      }
      // Pass through other types (numbers, booleans)
      else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Basic HTML sanitization
   * @param {string} html - HTML to sanitize
   * @returns {string} Sanitized HTML
   */
  static sanitizeHtml(html) {
    // Remove script tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    html = html.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    html = html.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: URLs
    html = html.replace(/javascript:/gi, '');

    return html;
  }

  /**
   * Validate custom field value
   * @param {*} value - Value to validate
   * @param {string} type - Field type (text, number, enum, etc.)
   * @returns {*} Validated value
   */
  static validateCustomFieldValue(value, type) {
    const schemas = {
      text: Joi.string().max(4096),
      number: Joi.number(),
      enum: Joi.string().pattern(/^\d+$/), // Enum option GID
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      people: Joi.array().items(Joi.string().pattern(/^\d+$/))
    };

    const schema = schemas[type];
    if (!schema) {
      throw new Error(`Unknown custom field type: ${type}`);
    }

    const { error, value: validated } = schema.validate(value);
    if (error) {
      throw new Error(`Custom field validation failed: ${error.details[0].message}`);
    }

    return validated;
  }
}

module.exports = InputValidator;
