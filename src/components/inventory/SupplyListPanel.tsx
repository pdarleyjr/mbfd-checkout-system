import React, { useState, useMemo } from 'react';
import { Package, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import type { InventoryItem } from '../../lib/inventory';

interface SupplyListPanelProps {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type SortField = 'name' | 'quantity' | 'location';
type SortDirection = 'asc' | 'desc';

export const SupplyListPanel: React.FC<SupplyListPanelProps> = ({
  items,
  isLoading,
  error,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredAndSortedItems = useMemo(() => {
    let results = items;

    // Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (item) =>
          item.equipmentName.toLowerCase().includes(term) ||
          item.equipmentType.toLowerCase().includes(term) ||
          item.location?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    results = [...results].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortField) {
        case 'name':
          compareValue = a.equipmentName.localeCompare(b.equipmentName);
          break;
        case 'quantity':
          compareValue = a.quantity - b.quantity;
          break;
        case 'location':
          compareValue = (a.location || '').localeCompare(b.location || '');
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return results;
  }, [items, searchTerm, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (error) {
    return (
      <Card className="border-red-300">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Error Loading Inventory</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <Button onClick={onRefresh} variant="secondary">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base"
            />
          </div>
          <Button
            onClick={onRefresh}
            variant="secondary"
            className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            disabled={isLoading}
            aria-label="Refresh inventory"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => toggleSort('name')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              sortField === 'name'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('quantity')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              sortField === 'quantity'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('location')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              sortField === 'location'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Location {sortField === 'location' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Items List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'No items found' : 'No inventory items'}
            </p>
            <p className="text-gray-600 mt-1">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Inventory list is empty'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedItems.map((item) => {
            const isLowStock = item.minQty && item.quantity <= item.minQty;
            
            return (
              <Card
                key={item.id}
                className={`hover:shadow-md transition-shadow ${
                  isLowStock ? 'border-orange-300' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={`w-5 h-5 flex-shrink-0 ${isLowStock ? 'text-orange-600' : 'text-blue-600'}`} />
                        <h3 className="font-bold text-gray-900 truncate">
                          {item.equipmentName}
                        </h3>
                        {isLowStock && (
                          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          <span className="font-semibold">Type:</span> {item.equipmentType}
                        </p>
                        {item.location && (
                          <p className="text-gray-600">
                            <span className="font-semibold">Location:</span> {item.location} (Shelf {item.shelf}, Row {item.row})
                          </p>
                        )}
                        {item.manufacturer && (
                          <p className="text-gray-600">
                            <span className="font-semibold">Mfg:</span> {item.manufacturer}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-gray-500 text-xs mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-3xl font-bold ${
                        isLowStock ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {item.quantity}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.minQty ? `Min: ${item.minQty}` : 'in stock'}
                      </div>
                      {isLowStock && (
                        <div className="text-xs font-semibold text-orange-600 mt-1">
                          LOW STOCK
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && filteredAndSortedItems.length > 0 && (
        <div className="text-center text-sm text-gray-600 py-2">
          Showing {filteredAndSortedItems.length} of {items.length} items
        </div>
      )}
    </div>
  );
};