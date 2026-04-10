'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import '@/styles/sidebar.css'

interface Subcategory {
  id: string
  name: string
  slug: string
  description: string
  categoryId: string
}

interface Category {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
  subcategories: Subcategory[]
}

interface CategorySidebarProps {
  selectedCategory?: string
  selectedSubcategory?: string
  onCategorySelect: (categoryId: string) => void
  onSubcategorySelect: (categoryId: string, subcategoryId: string) => void
  onClearFilters: () => void
  className?: string
}

export default function CategorySidebar({
  selectedCategory,
  selectedSubcategory,
  onCategorySelect,
  onSubcategorySelect,
  onClearFilters,
  className = ''
}: CategorySidebarProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const selectedCategoryData = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)
    : undefined

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories`)
        if (response.ok) {
          const data = await response.json()
          setCategories(data.data || [])
          
          // Auto-expand the selected category
          if (selectedCategory) {
            setExpandedCategories(prev => new Set(Array.from(prev).concat(selectedCategory)))
          }
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [selectedCategory])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set<string>()
      // Accordion behavior: Only one category can be expanded at a time
      // If the category is already expanded, collapse it (empty set)
      // If it's not expanded, expand only this category (closes others)
      if (!prev.has(categoryId)) {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleCategoryClick = (categoryId: string) => {
    toggleCategory(categoryId)
    onCategorySelect(categoryId)
  }

  const handleSubcategoryClick = (categoryId: string, subcategoryId: string) => {
    onSubcategorySelect(categoryId, subcategoryId)
  }

  if (loading) {
    return (
      <aside className={`bg-white border-r border-gray-200 ${className}`}>
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className={`bg-white border-r border-gray-200 category-sidebar ${className}`}>
      <div className="p-4 max-h-screen overflow-y-auto">
        {/* Mobile Dropdown */}
        <div className="md:hidden">
          {(selectedCategory || selectedSubcategory) && (
            <div className="mb-2 flex justify-end">
              <button
                onClick={onClearFilters}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label
                htmlFor="mobile-category-select"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                Category
              </label>
              <select
                id="mobile-category-select"
                value={selectedCategory || ''}
                onChange={(event) => {
                  const value = event.target.value
                  if (!value) {
                    onClearFilters()
                  } else {
                    onCategorySelect(value)
                  }
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ''}{category.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategoryData && selectedCategoryData.subcategories?.length > 0 && (
              <div>
                <label
                  htmlFor="mobile-subcategory-select"
                  className="mb-1 block text-xs font-medium text-gray-500"
                >
                  Subcategory
                </label>
                <select
                  id="mobile-subcategory-select"
                  value={selectedSubcategory || ''}
                  onChange={(event) => {
                    const subcategoryId = event.target.value
                    if (!subcategoryId) {
                      onSubcategorySelect(selectedCategoryData.id, '')
                    } else {
                      onSubcategorySelect(selectedCategoryData.id, subcategoryId)
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All subcategories</option>
                  {selectedCategoryData.subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            {(selectedCategory || selectedSubcategory) && (
              <button
                onClick={onClearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* All Categories Option */}
          <button
            onClick={onClearFilters}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-2 ${
              !selectedCategory
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-3 text-lg">📋</span>
            All Categories
          </button>

          {/* Categories List */}
          <div className="space-y-1">
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.id)
              const isSelected = selectedCategory === category.id
              const hasSubcategories = category.subcategories && category.subcategories.length > 0

              return (
                <div key={category.id} className="space-y-1">
                  {/* Category Button */}
                  <button
                    onClick={() => handleCategoryClick(category.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg category-button ${
                      isSelected && !selectedSubcategory
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 category-active'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {/* Category Icon */}
                    <span className="mr-3 text-lg">{category.icon}</span>
                    
                    {/* Category Name */}
                    <span className="flex-1 text-left truncate">{category.name}</span>
                    
                    {/* Expand/Collapse Icon */}
                    {hasSubcategories && (
                      <div className="ml-2 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* Subcategories */}
                  {hasSubcategories && isExpanded && (
                    <div className="ml-6 space-y-1 border-l border-gray-200 pl-3 category-dropdown">
                      {category.subcategories.map((subcategory) => {
                        const isSubSelected = selectedSubcategory === subcategory.id

                        return (
                          <button
                            key={subcategory.id}
                            onClick={() => handleSubcategoryClick(category.id, subcategory.id)}
                            className={`w-full flex items-start px-3 py-2 text-xs rounded-md transition-colors subcategory-connector ${
                              isSubSelected
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                            }`}
                            title={subcategory.description}
                          >
                            <div className="flex-1 text-left">
                              <div className="font-medium">{subcategory.name}</div>
                              {subcategory.description && (
                                <div className="text-gray-500 mt-1 text-xs leading-relaxed overflow-hidden">
                                  <span className="line-clamp-2">{subcategory.description}</span>
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {categories.length} categories, {categories.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)} subcategories
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
