import React from 'react';
import { Truck } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../ui/Card';
import { VehicleManagement } from '../VehicleManagement';

interface VehiclesModuleProps {
  adminPassword?: string;
}

export const VehiclesModule: React.FC<VehiclesModuleProps> = () => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Vehicle Management</h2>
          <Truck className="w-6 h-6 text-blue-600" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex-1 overflow-auto">
          <VehicleManagement />
        </div>
      </CardContent>
    </Card>
  );
};
