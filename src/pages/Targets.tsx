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
  const [newContact, setNewContact] = useState({ name: '', target_id: '', type: 'number' });

  // Sync Modal State
  const [syncModal, setSyncModal] = useState<{ isOpen: boolean, type: 'group' | 'channel' }>({ isOpen: false, type: 'group' });
  const [availableTargets, setAvailableTargets] = useState<any[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set());
  const [isFetchingTargets, setIsFetchingTargets] = useState(false);

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

  const openSyncModal = async (type: 'group' | 'channel') => {
    if (!selectedSession) return;
    setSyncModal({ isOpen: true, type });
    setIsFetchingTargets(true);
    setAvailableTargets([]);
    setSelectedTargetIds(new Set());

    try {
      const endpoint = type === 'group' ? '/api/whatsapp/groups' : '/api/whatsapp/channels';
      const res = await fetch(`${endpoint}?session_id=${selectedSession}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 501 || data.code === 'NOT_SUPPORTED') {
          alert(`${type === 'group' ? 'Group' : 'Channel'} syncing is not supported by your WhatsApp server version. You can add them manually.`);
        } else {
          alert(data.error || `Failed to fetch ${type}s`);
        }
        setSyncModal({ isOpen: false, type });
        return;
      }

      const normalized = data.map((item: any) => {
        if (typeof item === 'string') return { id: item, name: item };
        return {
          id: item.id?._serialized || item.id || item.jid,
          name: item.name || item.subject || 'Unknown'
        };
      }).filter((item: any) => item.id);

      setAvailableTargets(normalized);
    } catch (error) {
      console.error(error);
      alert(`An error occurred while fetching ${type}s.`);
      setSyncModal({ isOpen: false, type });
    } finally {
      setIsFetchingTargets(false);
    }
  };

  const handleSaveSelectedTargets = async () => {
    if (!selectedSession || selectedTargetIds.size === 0) return;
    setLoading(true);
    try {
      const targetsToSave = availableTargets
        .filter(t => selectedTargetIds.has(t.id))
        .map(t => ({
          target_id: t.id,
          name: t.name,
          type: syncModal.type
        }));

      await fetch('/api/targets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          targets: targetsToSave
        })
      });

      setSyncModal({ isOpen: false, type: 'group' });
      fetchTargets();
    } catch (error) {
      console.error(error);
      alert('Failed to save selected targets');
    } finally {
      setLoading(false);
    }
  };

  const toggleTargetSelection = (id: string) => {
    const newSet = new Set(selectedTargetIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTargetIds(newSet);
  };

  const toggleAllTargets = () => {
    if (selectedTargetIds.size === availableTargets.length) {
      setSelectedTargetIds(new Set());
    } else {
      setSelectedTargetIds(new Set(availableTargets.map(t => t.id)));
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !newContact.target_id) return;
    setLoading(true);
    try {
      await fetch('/api/targets/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          target_id: newContact.target_id,
          name: newContact.name,
          type: newContact.type,
        }),
      });
      setNewContact({ name: '', target_id: '', type: 'number' });
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
          onClick={() => openSyncModal('group')}
          disabled={loading || !selectedSession}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t('sync_groups')}
        </button>
        <button
          onClick={() => openSyncModal('channel')}
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
          {t('add_target', 'Add Target')}
        </button>
      </div>

      {/* Sync Modal */}
      {syncModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold mb-4 capitalize">
              {t('select')} {syncModal.type}s
            </h3>
            
            {isFetchingTargets ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : availableTargets.length === 0 ? (
              <div className="flex-1 py-8 text-center text-gray-500">
                No {syncModal.type}s found.
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={selectedTargetIds.size === availableTargets.length && availableTargets.length > 0}
                    onChange={toggleAllTargets}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="selectAll" className="ml-2 text-sm font-medium text-gray-700">
                    {t('select_all', 'Select All')} ({selectedTargetIds.size}/{availableTargets.length})
                  </label>
                </div>
                
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {availableTargets.map((target) => (
                    <div key={target.id} className="flex items-center p-3 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`target-${target.id}`}
                        checked={selectedTargetIds.has(target.id)}
                        onChange={() => toggleTargetSelection(target.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <label htmlFor={`target-${target.id}`} className="ml-3 flex flex-col cursor-pointer flex-1">
                        <span className="text-sm font-medium text-gray-900">{target.name}</span>
                        <span className="text-xs text-gray-500 font-mono">{target.id}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSyncModal({ isOpen: false, type: 'group' })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveSelectedTargets}
                disabled={loading || selectedTargetIds.size === 0 || isFetchingTargets}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {t('save_selected', 'Save Selected')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{t('add_target', 'Add Target')}</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('type')}</label>
                <select
                  value={newContact.type}
                  onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="number">{t('number', 'Number')}</option>
                  <option value="group">{t('group', 'Group')}</option>
                  <option value="channel">{t('channel', 'Channel')}</option>
                  <option value="channel_invite">{t('channel_invite', 'Channel Invite')}</option>
                </select>
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newContact.type === 'channel_invite' ? t('invite_url_code', 'Invite URL or Code') : t('target_id', 'Target ID (Phone, Group JID, Channel JID)')}
                </label>
                <input
                  type="text"
                  value={newContact.target_id}
                  onChange={(e) => setNewContact({ ...newContact, target_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={newContact.type === 'channel_invite' ? "e.g., https://whatsapp.com/channel/... or CODE" : "e.g., 1234567890 or 123@g.us"}
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
