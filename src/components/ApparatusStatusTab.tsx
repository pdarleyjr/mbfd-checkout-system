import React, { useState } from 'react';
import { Truck, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardContent } from './ui/Card';
import { useApparatusStatus } from '../hooks/useApparatusStatus';
import { useVehicleChangeRequests } from '../hooks/useVehicleChangeRequests';

export const ApparatusStatusTab: React.FC = () => {
  const { statuses, allVehicles, loading: statusLoading, error: statusError, refetch: refetchStatuses } = useApparatusStatus();
  const { 
    requests, 
    loading: requestsLoading, 
    pendingCount,
    approveRequest,
    rejectRequest,
    refetch: refetchRequests 
  } = useVehicleChangeRequests({ pollInterval: 30000 });

  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = async (requestId: string) => {
    if (!confirm('Approve this vehicle change? This will update the Google Sheet.')) {
      return;
    }

    setActioningRequestId(requestId);
    try {
      await approveRequest(requestId, 'Admin', 'Approved by admin dashboard');
      alert('Vehicle change approved and sheet updated!');
      await refetchStatuses(); // Refresh apparatus statuses
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    } finally {
      setActioningRequestId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;

    setActioningRequestId(rejectId);
    try {
      await rejectRequest(rejectId, 'Admin', rejectNotes || 'Rejected by admin');
      alert('Vehicle change request rejected.');
      setShowRejectModal(false);
      setRejectId(null);
      setRejectNotes('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setActioningRequestId(null);
    }
  };

  const openRejectModal = (requestId: string) => {
    setRejectId(requestId);
    setShowRejectModal(true);
  };

  if (statusLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading apparatus status...</p>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-900 mb-2">Error Loading Apparatus Status</h3>
          <p className="text-red-700 mb-4">{statusError}</p>
          <Button onClick={refetchStatuses} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Helper to get the assigned unit for a vehicle from statuses
  const getAssignedUnit = (vehicleNo: string): string | null => {
    const status = statuses.find(s => s.vehicleNo === vehicleNo);
    return status?.unit || null;
  };

  // Determine card styling based on status
  const getVehicleCardClass = (status: string): string => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('out of service')) {
      return 'border-2 border-red-500 bg-red-50 hover:border-red-600';
    }
    return 'border-2 border-gray-300 bg-white hover:border-blue-400';
  };

  const getStatusBadgeClass = (status: string): string => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('out of service')) {
      return 'bg-red-600 text-white';
    }
    if (lowerStatus.includes('in service')) {
      return 'bg-green-600 text-white';
    }
    return 'bg-gray-600 text-white';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fleet Status</h2>
          <p className="text-gray-600 mt-1">All vehicles and current assignments</p>
        </div>
        <Button onClick={() => { refetchStatuses(); refetchRequests(); }} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Change Requests Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-1">
                {pendingCount} Pending Vehicle Change Request{pendingCount !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-amber-800">
                Review and approve/reject vehicle changes reported by field personnel below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Vehicles Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-700" />
            <h3 className="text-xl font-bold text-gray-900">All Vehicles</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allVehicles.map((vehicle) => {
              const assignedUnit = getAssignedUnit(vehicle.vehicleNo);
              const isOutOfService = vehicle.status.toLowerCase().includes('out of service');
              
              return (
                <div
                  key={vehicle.vehicleNo}
                  className={`${getVehicleCardClass(vehicle.status)} rounded-lg p-4 transition-colors`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-3xl font-bold text-blue-700">#{vehicle.vehicleNo}</h4>
                      {assignedUnit && (
                        <p className="text-lg font-semibold text-gray-900 mt-1">{assignedUnit}</p>
                      )}
                      {!assignedUnit && vehicle.designation && (
                        <p className="text-sm text-gray-600 mt-1">{vehicle.designation}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded ${getStatusBadgeClass(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {vehicle.assignment && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Assignment:</span> {vehicle.assignment}
                      </p>
                    )}
                    {vehicle.currentLocation && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Location:</span> {vehicle.currentLocation}
                      </p>
                    )}
                    {vehicle.notes && (
                      <p className={`text-xs italic mt-2 ${isOutOfService ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
                        {vehicle.notes}
                      </p>
                    )}
                  </div>
                  
                  {!assignedUnit && !vehicle.designation && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Reserve</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {allVehicles.length === 0 && (
            <p className="text-center text-gray-500 py-8">No vehicle data available</p>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Change Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-orange-700" />
            <h3 className="text-xl font-bold text-gray-900">Vehicle Change Requests</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests
              .filter(req => req.status === 'pending')
              .map((request) => (
                <div
                  key={request.id}
                  className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900 text-lg">{request.apparatus}</h4>
                        <span className="px-2 py-1 text-xs font-bold bg-orange-200 text-orange-900 rounded">
                          PENDING
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-700">
                          <span className="font-semibold">Old Vehicle:</span> #{request.oldVehicleNo || 'None'}
                          {' → '}
                          <span className="font-semibold">New Vehicle:</span> #{request.newVehicleNo}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-semibold">Reported by:</span> {request.reportedBy}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-semibold">Date:</span>{' '}
                          {new Date(request.reportedAt).toLocaleString()}
                        </p>
                        {request.notes && (
                          <p className="text-gray-500 italic mt-2">{request.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={actioningRequestId === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => openRejectModal(request.id)}
                        disabled={actioningRequestId === request.id}
                        variant="secondary"
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            {requests.filter(req => req.status === 'pending').length === 0 && (
              <p className="text-center text-gray-500 py-8">No pending vehicle change requests</p>
            )}
          </div>

          {/* Recently Processed Requests */}
          {requests.filter(req => req.status !== 'pending').length > 0 && (
            <div className="mt-8 pt-6 border-t-2 border-gray-200">
              <h4 className="font-bold text-gray-700 mb-4">Recently Processed</h4>
              <div className="space-y-3">
                {requests
                  .filter(req => req.status !== 'pending')
                  .slice(0, 5)
                  .map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900">{request.apparatus}</span>
                            <span
                              className={`px-2 py-0.5 text-xs font-bold rounded ${
                                request.status === 'approved'
                                  ? 'bg-green-200 text-green-900'
                                  : 'bg-red-200 text-red-900'
                              }`}
                            >
                              {request.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs">
                            #{request.oldVehicleNo || 'None'} → #{request.newVehicleNo} • Reported by {request.reportedBy}
                          </p>
                          {request.reviewedBy && (
                            <p className="text-gray-500 text-xs mt-1">
                              Reviewed by {request.reviewedBy} on{' '}
                              {new Date(request.reviewedAt!).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Vehicle Change Request</h3>
            <p className="text-gray-700 mb-4">
              Provide a reason for rejecting this vehicle change request:
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectId(null);
                  setRejectNotes('');
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={actioningRequestId === rejectId}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
