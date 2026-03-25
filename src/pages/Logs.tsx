import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Logs() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<any[]>([]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t('nav_logs')}</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('session_id')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('target_id')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('message_type')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('status')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('details', 'Details')}</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600">{t('created_at')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {messages.map((msg) => (
              <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-800">{msg.session_id}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{msg.target_id}</td>
                <td className="px-6 py-4 text-sm text-gray-800 capitalize">{msg.message_type}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(msg.status)}
                    <span className="text-sm font-medium text-gray-700">{t(msg.status.toLowerCase())}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={msg.details}>
                  {msg.details || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(msg.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No messages found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
