import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';

export default function Compose() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    session_id: '',
    target_id: '',
    target_type: 'number',
    message_type: 'text',
    content: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessRes, targRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/targets')
        ]);
        const sessData = await sessRes.json();
        const targData = await targRes.json();
        setSessions(sessData);
        setTargets(targData);
        if (sessData.length > 0) {
          setFormData(prev => ({ ...prev, session_id: sessData[0].session_id }));
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTarget = targets.find(t => t.target_id === e.target.value);
    setFormData(prev => ({
      ...prev,
      target_id: e.target.value,
      target_type: selectedTarget ? selectedTarget.type : 'number'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.session_id || !formData.target_id) return;
    
    setLoading(true);
    setStatusMsg(null);
    
    const submitData = new FormData();
    submitData.append('session_id', formData.session_id);
    submitData.append('target_id', formData.target_id);
    submitData.append('target_type', formData.target_type);
    submitData.append('message_type', formData.message_type);
    if (formData.content) submitData.append('content', formData.content);
    if (file) submitData.append('file', file);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        body: submitData,
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: t('success') });
        setFormData(prev => ({ ...prev, content: '' }));
        setFile(null);
      } else {
        const errorText = data.details ? `${data.error}: ${JSON.stringify(data.details)}` : data.error || t('error');
        setStatusMsg({ type: 'error', text: errorText });
      }
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredTargets = targets.filter(t => t.session_id === formData.session_id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t('nav_compose')}</h2>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-lg ${statusMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session & Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('session_id')}</label>
              <select
                value={formData.session_id}
                onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="" disabled>Select Session</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.session_id}>{s.session_id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('select_target')}</label>
              <select
                value={formData.target_id}
                onChange={handleTargetChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="" disabled>{t('select_target')}</option>
                {filteredTargets.map(target => (
                  <option key={target.id} value={target.target_id}>
                    {target.name || target.target_id} ({t(target.type)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('message_type')}</label>
            <div className="flex flex-wrap gap-4">
              {['text', 'media', 'attachment', 'mixed'].map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="message_type"
                    value={type}
                    checked={formData.message_type === type}
                    onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="capitalize text-gray-700">{t(type)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Content */}
          {(formData.message_type === 'text' || formData.message_type === 'mixed' || formData.message_type === 'media' || formData.message_type === 'attachment') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.message_type === 'text' ? t('content') : 'Caption / Text'}
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px]"
                placeholder="Type your message here..."
                required={formData.message_type === 'text'}
              />
            </div>
          )}

          {/* File Upload */}
          {formData.message_type !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('file')}</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 transition-colors">
                <div className="space-y-1 text-center">
                  {formData.message_type === 'media' ? (
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  ) : (
                    <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                  )}
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        required
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    {file ? file.name : 'PNG, JPG, MP4, PDF up to 10MB'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || !formData.session_id || !formData.target_id}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {t('send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
