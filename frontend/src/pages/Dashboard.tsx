import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRecords } from '../hooks/useRecords';
import { RecordForm } from '../components/RecordForm';
import { BulkUpload } from '../components/BulkUpload';
import { ImplementationList } from '../components/ImplementationList';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const { recordsList, loading, list, create, confirm, deleteRecord } = useRecords();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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
    setIsCreating(true);
    try {
      await create(data);
      await loadRecords();
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = (id: number) => {
    setSelectedRecordId(id);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async (notes: string, environment: string) => {
    if (!selectedRecordId) return;

    setIsConfirming(true);
    try {
      await confirm(selectedRecordId, { notes, environment });
      await loadRecords();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await deleteRecord(id);
      await loadRecords();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete record');
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

        <BulkUpload onComplete={loadRecords} />

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
        />
      </main>

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
