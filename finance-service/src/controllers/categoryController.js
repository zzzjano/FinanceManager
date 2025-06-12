const Category = require('../models/Category');
const { logger } = require('../utils/logger');

// Get all categories for the authenticated user
const getAllCategories = async (req, res, next) => {
  try {
    // If admin, can get all categories or filter by userId
    const userRoles = req.auth.realm_access?.roles
    const filter = userRoles.includes('admin') && req.query.userId
      ? { userId: req.query.userId }
      : { userId: req.auth.sub };
    
    // Add additional filters if provided
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    const categories = await Category.find(filter).select('-__v');
    
    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: { categories }
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    next(error);
  }
};

// Create a new category
const createCategory = async (req, res, next) => {
  try {
    const { name, type, color, icon, parent } = req.body;
    const userRoles = req.auth.realm_access?.roles
    // Set userId based on current user (or specified user if admin)
    const userId = userRoles.includes('admin') && req.body.userId
      ? req.body.userId
      : req.auth.sub;
    
    // Create category data object and only include parent if it's not empty
    const categoryData = {
      userId,
      name,
      type,
      color,
      icon
    };
    
    // Only add parent field if it's not an empty string or undefined
    if (parent) {
      categoryData.parent = parent;
    }
    
    const newCategory = await Category.create(categoryData);
    
    res.status(201).json({
      status: 'success',
      data: { category: newCategory }
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    next(error);
  }
};

// Get a category by ID
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).select('-__v');
    
    if (!category) {
      return res.status(404).json({
        status: 'fail',
        message: 'Category not found'
      });
    }
    const userRoles = req.auth.realm_access?.roles
    // Check if user has access to this category
    if (!userRoles.includes('admin') && category.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this category'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { category }
    });
  } catch (error) {
    logger.error(`Error fetching category with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update a category
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, color, icon, isActive, parent } = req.body;
    
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        status: 'fail',
        message: 'Category not found'
      });
    }
    const userRoles = req.auth.realm_access?.roles
    // Check if user has access to update this category
    if (!userRoles.includes('admin') && category.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to update this category'
      });
    }
      // Create update object with only defined fields
    const updateData = {
      name: name !== undefined ? name : category.name,
      type: type || category.type,
      color: color !== undefined ? color : category.color,
      icon: icon !== undefined ? icon : category.icon,
      isActive: isActive !== undefined ? isActive : category.isActive
    };
    
    // Handle parent field specifically to avoid empty string issues
    if (parent === null) {
      // Explicitly set to null if null is provided
      updateData.parent = null;
    } else if (parent) {
      // Only set parent if it has a value and is not empty string
      updateData.parent = parent;
    }
    // If parent is undefined or empty string, don't include it in the update
    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');
    
    res.status(200).json({
      status: 'success',
      data: { category: updatedCategory }
    });
  } catch (error) {
    logger.error(`Error updating category with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete a category
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        status: 'fail',
        message: 'Category not found'
      });
    }
    const userRoles = req.auth.realm_access?.roles
    // Check if user has access to delete this category
    if (!userRoles.includes('admin') && category.userId !== req.auth.sub) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to delete this category'
      });
    }
    
    await Category.findByIdAndDelete(id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error(`Error deleting category with ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory
};
