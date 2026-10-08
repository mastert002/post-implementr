import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRecords } from '../hooks/useRecords';
import { RecordForm } from '../components/RecordForm';
import { BulkUpload } from '../components/BulkUpload';
import { ImplementationList } from '../components/ImplementationList';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { RevertModal } from '../components/RevertModal';
import { records } from '../api/client';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const { recordsList, loading, list, create, confirm, deleteRecord } = useRecords();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [operationCount, setOperationCount] = useState(0);
  const [revertRecordId, setRevertRecordId] = useState<number | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [statusFilter, searchQuery]);

  const loadRecords = async () => {
    const params: any = {
      limit: 50,
      offset: 0,
    };

    if (searchQuery) {
      params.search = searchQuery;
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    try {
      await list(params);
    } catch (err) {
      console.error('Failed to load records:', err);
    }
  };

  const handleCreateRecord = async (data: any) => {
    setOperationCount((c) => c + 1);
    setIsCreating(true);
    try {
      await create(data);
      await loadRecords();
      setSuccessMessage('Record added successfully');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = (id: number) => {
    setSelectedRecordId(id);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async (notes: string, environment: string, category: string) => {
    if (!selectedRecordId) return;
    setOperationCount((c) => c + 1);

    setIsConfirming(true);
    try {
      await confirm(selectedRecordId, { notes, environment, category });
      await loadRecords();
      setSuccessMessage('Record confirmed successfully');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    setOperationCount((c) => c + 1);
    try {
      await deleteRecord(id);
      await loadRecords();
      setSuccessMessage('Record deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete record');
    }
  };

  const handleRevertSubmit = async (comment: string) => {
    if (!revertRecordId) return;
    setOperationCount((c) => c + 1);
    setIsReverting(true);
    try {
      await records.revertToPending(revertRecordId, comment);
      await loadRecords();
      setSuccessMessage('Record set to pending');
    } finally {
      setIsReverting(false);
    }
  };

  const handleViewDetails = (id: number) => {
    // This is where we could expand to show full history
    // For now, it's handled by the ImplementationList component
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Post-Implementr</h1>
          <div className="flex items-center gap-4">
            <Link to="/report" className="text-blue-600 hover:text-blue-800 text-sm">
              General Report
            </Link>
            <span className="text-gray-700 text-sm">
              Welcome, <span className="font-semibold">{user?.email}</span>
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RecordForm onSubmit={handleCreateRecord} isLoading={isCreating} />

        <BulkUpload onComplete={loadRecords} resetToken={operationCount} />

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by PR ID, JIRA key, or description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
        </div>

        <ImplementationList
          records={recordsList}
          isLoading={loading}
          onConfirm={handleConfirm}
          onViewDetails={handleViewDetails}
          onDelete={handleDelete}
          onRevert={(id) => setRevertRecordId(id)}
        />
      </main>

      {successMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <button
              onClick={() => setSuccessMessage(null)}
              aria-label="Close"
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-xl leading-none"
            >
              ×
            </button>
            <p className="text-lg font-semibold text-green-700 mb-4">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <RevertModal
        isOpen={revertRecordId !== null}
        onClose={() => setRevertRecordId(null)}
        onSubmit={handleRevertSubmit}
        isLoading={isReverting}
      />

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedRecordId(null);
        }}
        onConfirm={handleConfirmSubmit}
        isLoading={isConfirming}
      />
    </div>
  );
};
