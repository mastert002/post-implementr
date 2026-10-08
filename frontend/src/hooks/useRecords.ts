import { useState, useCallback } from 'react';
import { records } from '../api/client';

export interface Record {
  id: number;
  pr_url: string;
  pr_id?: string;
  jira_keys?: string;
  description?: string;
  created_by_user_id: number;
  created_by_email?: string;
  created_at: string;
  latest_confirmation_id?: number;
  latest_confirmed_at?: string;
  latest_confirmation_notes?: string;
  latest_confirmed_by_email?: string;
  latest_confirmation_category?: string;
  jira_titles?: { [key: string]: string };
  latest_revert_at?: string;
  latest_revert_comment?: string;
  latest_revert_by_email?: string;
}

export interface Confirmation {
  id: number;
  implementation_record_id: number;
  confirmed_by_user_id: number;
  confirmed_by_email?: string;
  confirmed_at: string;
  notes?: string;
  environment: string;
}

export const useRecords = () => {
  const [recordsList, setRecordsList] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await records.list(params);
      setRecordsList(response.data.records);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch records';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data: any) => {
    setError(null);
    try {
      const response = await records.create(data);
      setRecordsList([response.data, ...recordsList]);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create record';
      setError(message);
      throw err;
    }
  }, [recordsList]);

  const getDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await records.getDetail(id);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch record';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = useCallback(async (id: number, data: any) => {
    setError(null);
    try {
      const response = await records.confirm(id, data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to confirm record';
      setError(message);
      throw err;
    }
  }, []);

  const deleteRecord = useCallback(async (id: number) => {
    setError(null);
    try {
      await records.delete(id);
      setRecordsList(recordsList.filter(r => r.id !== id));
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete record';
      setError(message);
      throw err;
    }
  }, [recordsList]);

  return {
    recordsList,
    loading,
    error,
    list,
    create,
    getDetail,
    confirm,
    deleteRecord,
  };
};
