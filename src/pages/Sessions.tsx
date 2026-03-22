import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Plus, QrCode } from 'lucide-react';

export default function Sessions() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [newSessionId, setNewSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleInitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionId) return;
    setLoading(true);
    try {
      await fetch('/api/sessions/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: newSessionId }),
      });
      setNewSessionId('');
      fetchSessions();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}/status`);
      fetchSessions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleScanQr = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}/scan`);
      const data = await res.json();
      if (data.url) {
        setQrUrl(data.url);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t('nav_sessions')}</h2>
      </div>

      {/* Init Session Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleInitSession} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('session_id')}</label>
            <input
              type="text"
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., my_bot_1"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {t('init_session')}
          </button>
        </form>
      </div>

      {/* QR Code Modal */}
      {qrUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl w-full h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold mb-4">{t('scan_qr')}</h3>
            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
              <iframe 
                src={qrUrl} 
                className="absolute inset-0 w-full h-full border-0"
                title="QR Code Scanner"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <button
              onClick={() => setQrUrl(null)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors mt-auto"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('session_id')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('status')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('created_at')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-800">{session.session_id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    session.status === 'CONNECTED' ? 'bg-green-100 text-green-800' :
                    session.status === 'DISCONNECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {session.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(session.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCheckStatus(session.session_id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title={t('check_status')}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleScanQr(session.session_id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title={t('scan_qr')}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
