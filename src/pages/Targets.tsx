import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Plus, Users, Hash, User } from 'lucide-react';

export default function Targets() {
  const { t } = useTranslation();
  const [targets, setTargets] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone_number: '' });

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/targets');
      const data = await res.json();
      setTargets(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
      if (data.length > 0) setSelectedSession(data[0].session_id);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTargets();
    fetchSessions();
  }, []);

  const handleSyncGroups = async () => {
    if (!selectedSession) return;
    setLoading(true);
    try {
      await fetch('/api/targets/groups/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedSession }),
      });
      fetchTargets();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncChannels = async () => {
    if (!selectedSession) return;
    setLoading(true);
    try {
      await fetch('/api/targets/channels/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedSession }),
      });
      fetchTargets();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !newContact.phone_number) return;
    setLoading(true);
    try {
      await fetch('/api/targets/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          phone_number: newContact.phone_number,
          name: newContact.name,
        }),
      });
      setNewContact({ name: '', phone_number: '' });
      setShowAddContact(false);
      fetchTargets();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'group': return <Users className="w-4 h-4 text-blue-500" />;
      case 'channel': return <Hash className="w-4 h-4 text-purple-500" />;
      default: return <User className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t('nav_targets')}</h2>
      </div>

      {/* Sync Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('session_id')}</label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.session_id}>{s.session_id}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSyncGroups}
          disabled={loading || !selectedSession}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t('sync_groups')}
        </button>
        <button
          onClick={handleSyncChannels}
          disabled={loading || !selectedSession}
          className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t('sync_channels')}
        </button>
        <button
          onClick={() => setShowAddContact(true)}
          disabled={loading || !selectedSession}
          className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {t('add_contact')}
        </button>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{t('add_contact')}</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone_number')}</label>
                <input
                  type="text"
                  value={newContact.phone_number}
                  onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., 1234567890"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Targets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('type')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('name')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('target_id')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('session_id')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {targets.map((target) => (
              <tr key={target.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getIcon(target.type)}
                    <span className="capitalize text-gray-700">{t(target.type)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">{target.name || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{target.target_id}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{target.session_id}</td>
              </tr>
            ))}
            {targets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No targets found. Sync groups/channels or add a contact.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
