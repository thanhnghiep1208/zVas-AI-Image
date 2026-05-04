import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, updateDoc, doc, getDoc, setDoc, deleteDoc, handleFirestoreError, OperationType, auth, where, orderBy, limit } from '../firebase';
import { CheckCircle, XCircle, User, Shield, ArrowLeft, Trash2, BarChart3 } from 'lucide-react';

import { AnalyticsDashboard } from './AnalyticsDashboard';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'editor' | 'advice';
  status: 'pending' | 'approved' | 'rejected';
}

interface AdminDashboardProps {
  onClose: () => void;
  initialTab?: 'users' | 'settings' | 'analytics';
  /** Role `advice`: chỉ hiển thị Analytics, không tải danh sách user / cấu hình */
  analyticsOnly?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  initialTab = 'users',
  analyticsOnly = false,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'analytics'>(
    analyticsOnly ? 'analytics' : initialTab
  );

  useEffect(() => {
    if (analyticsOnly) {
      setActiveTab('analytics');
    }
  }, [analyticsOnly]);
  const [systemApiKey, setSystemApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [seedanceApiKey, setSeedanceApiKey] = useState('');
  const [seedanceBaseUrl, setSeedanceBaseUrl] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-image-preview');
  const [seedanceModel, setSeedanceModel] = useState('seed-1.5-pro');
  const [defaultProvider, setDefaultProvider] = useState<'gemini' | 'openai' | 'seedance'>('gemini');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [selectedUserHistory, setSelectedUserHistory] = useState<{uid: string, email: string} | null>(null);
  const [userHistoryImages, setUserHistoryImages] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    if (!selectedUserHistory) {
      setUserHistoryImages([]);
      return;
    }

    setIsHistoryLoading(true);
    const historyRef = collection(db, 'history');
    const q = query(
      historyRef, 
      where('uid', '==', selectedUserHistory.uid), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const images = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserHistoryImages(images);
      setIsHistoryLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'history');
      setIsHistoryLoading(false);
    });

    return () => unsubscribeHistory();
  }, [selectedUserHistory]);

  useEffect(() => {
    if (analyticsOnly) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    // Load users (keep onSnapshot for real-time status updates, but remove nested loops)
    const q = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const usersData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        usersData.push(doc.data() as UserProfile);
      });
      setUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      if (error.message.includes('Quota exceeded')) {
        console.warn("Users list fetch quota exceeded.");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    // Load system settings
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSystemApiKey(data.systemApiKey || '');
          setOpenaiApiKey(data.openaiApiKey || '');
          setSeedanceApiKey(data.seedanceApiKey || '');
          setSeedanceBaseUrl(data.seedanceBaseUrl || '');
          setGeminiModel(data.geminiModel || 'gemini-3.1-flash-image-preview');
          setSeedanceModel(data.seedanceModel || 'seed-1.5-pro');
          setDefaultProvider(data.defaultProvider || 'gemini');
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    loadSettings();

    return () => unsubscribeUsers();
  }, [analyticsOnly]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(settingsRef, { 
        systemApiKey,
        openaiApiKey,
        seedanceApiKey,
        seedanceBaseUrl,
        geminiModel,
        seedanceModel,
        defaultProvider,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('Đã lưu cấu hình hệ thống thành công.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'editor' | 'advice') => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === auth.currentUser?.uid) {
      alert('Bạn không thể tự xóa chính mình!');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa người dùng ${userEmail}? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      alert('Đã xóa người dùng thành công.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col overflow-hidden">
      <header className="p-4 sm:p-6 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between bg-gray-800/50 backdrop-blur-md gap-4">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-cyan-400 truncate">
            {analyticsOnly ? 'Analytics' : 'Admin Dashboard'}
          </h1>
        </div>
        {!analyticsOnly && (
          <div className="flex items-center space-x-2 bg-gray-900/50 p-1 rounded-xl border border-gray-700 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'users' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Người dùng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'settings' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Cấu hình hệ thống
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'analytics' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Analytics
            </button>
          </div>
        )}
        {!analyticsOnly && (
          <div className="text-sm text-gray-400 hidden sm:block">
            Tổng cộng: <span className="text-white font-bold">{users.length}</span> người dùng
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          {activeTab === 'users' && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <User className="w-6 h-6 text-gray-300" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Danh sách người dùng</h2>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-900/50 border-b border-gray-700">
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Người dùng</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vai trò</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {users.map((user) => (
                          <tr key={user.uid} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <img 
                                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                                  alt={user.displayName} 
                                  className="w-10 h-10 rounded-full border border-gray-700"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-white">{user.displayName}</span>
                                  <span className="text-xs text-gray-500">{user.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <select 
                                  value={user.role}
                                  onChange={(e) =>
                                    handleUpdateRole(user.uid, e.target.value as 'admin' | 'editor' | 'advice')
                                  }
                                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none"
                                >
                                  <option value="editor">Editor</option>
                                  <option value="advice">Advice (chỉ Analytics)</option>
                                  <option value="admin">Admin</option>
                                </select>
                                {user.role === 'admin' && (
                                  <span className="inline-flex" aria-label="Admin">
                                    <Shield className="w-3 h-3 text-cyan-400" />
                                  </span>
                                )}
                                {user.role === 'advice' && (
                                  <span className="inline-flex" aria-label="Advice — chỉ Analytics">
                                    <BarChart3 className="w-3 h-3 text-violet-400 shrink-0" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                                user.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>
                                {user.status === 'approved' ? 'Đã duyệt' :
                                 user.status === 'rejected' ? 'Từ chối' :
                                 'Chờ duyệt'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={() => handleUpdateStatus(user.uid, 'approved')}
                                  disabled={user.status === 'approved'}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    user.status === 'approved' 
                                    ? 'text-gray-600 cursor-not-allowed' 
                                    : 'text-emerald-500 hover:bg-emerald-500/10'
                                  }`}
                                  title="Duyệt"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(user.uid, 'rejected')}
                                  disabled={user.status === 'rejected'}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    user.status === 'rejected' 
                                    ? 'text-gray-600 cursor-not-allowed' 
                                    : 'text-red-500 hover:bg-red-500/10'
                                  }`}
                                  title="Từ chối"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => setSelectedUserHistory({ uid: user.uid, email: user.email })}
                                  className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all"
                                  title="Xem lịch sử"
                                >
                                  <Shield className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.uid, user.email)}
                                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                  title="Xóa người dùng"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="bg-gray-800 border border-cyan-500/30 rounded-2xl p-4 sm:p-8 shadow-2xl max-w-4xl mx-auto">
              <div className="flex items-center space-x-4 mb-8">
                <div className="p-3 bg-cyan-500/20 rounded-xl">
                  <Shield className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Cấu hình hệ thống</h2>
                  <p className="text-gray-400 text-sm">Quản lý API Keys và các thiết lập mặc định cho toàn bộ ứng dụng.</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="flex flex-col space-y-4">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Default Provider (API Mặc định)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['gemini', 'openai', 'seedance'].map((provider) => (
                      <label 
                        key={provider} 
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          defaultProvider === provider 
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                          : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input 
                            type="radio" 
                            name="defaultProvider" 
                            value={provider}
                            checked={defaultProvider === provider}
                            onChange={(e) => setDefaultProvider(e.target.value as any)}
                            className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 focus:ring-cyan-500"
                          />
                          <span className={`font-bold transition-colors ${defaultProvider === provider ? 'text-white' : 'text-gray-400'}`}>
                            {provider.charAt(0).toUpperCase() + provider.slice(1)}
                          </span>
                        </div>
                        {defaultProvider === provider && <CheckCircle className="w-5 h-5 text-cyan-400" />}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Gemini API Key (Master)</label>
                    <input 
                      type="password"
                      value={systemApiKey}
                      onChange={(e) => setSystemApiKey(e.target.value)}
                      placeholder="Nhập Gemini API Key..."
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Gemini Model</label>
                    <select 
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    >
                      <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (3.1 Flash)</option>
                      <option value="gemini-3-pro-image-preview">Nano Banana Pro (3 Pro)</option>
                      <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">OpenAI API Key</label>
                    <input 
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="Nhập OpenAI API Key..."
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Seedance 1.5 Pro API Key</label>
                    <input 
                      type="password"
                      value={seedanceApiKey}
                      onChange={(e) => setSeedanceApiKey(e.target.value)}
                      placeholder="Nhập Seedance API Key..."
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Seedance Model Name</label>
                    <input 
                      type="text"
                      value={seedanceModel}
                      onChange={(e) => setSeedanceModel(e.target.value)}
                      placeholder="seed-1.5-pro"
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Seedance API Base URL (Optional)</label>
                    <input 
                      type="text"
                      value={seedanceBaseUrl}
                      onChange={(e) => setSeedanceBaseUrl(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20"
                    />
                    <p className="text-[10px] text-gray-500 italic">Để trống nếu sử dụng endpoint mặc định của nhà cung cấp.</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-700">
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="w-full px-8 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center space-x-2"
                  >
                    {isSavingSettings ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Lưu tất cả cấu hình</span>
                    )}
                  </button>
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-400 leading-relaxed">
                      <span className="font-bold uppercase mr-1">Lưu ý về hạn mức (Quota):</span>
                      Nếu bạn sử dụng API Key từ dự án MIỄN PHÍ (Free Tier), bạn sẽ bị giới hạn lượt tạo ảnh rất thấp (Dưới 1500 ảnh/ngày và giới hạn số lần tạo mỗi phút). Nếu gặp lỗi "Quota Exceeded", vui lòng sử dụng API Key từ dự án có tính phí (Paid project) để có trải nghiệm ổn định hơn.
                    </p>
                  </div>
                  <div className="mt-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-xs text-blue-400 leading-relaxed">
                      <span className="font-bold uppercase mr-1">Lưu ý quan trọng:</span>
                      Các API Key này sẽ được dùng làm fallback hệ thống. Nếu người dùng không tự cấu hình API Key cá nhân, ứng dụng sẽ sử dụng các key này để thực hiện yêu cầu.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'analytics' && (
            <section className="animate-fadeIn">
              <AnalyticsDashboard readOnly={analyticsOnly} />
            </section>
          )}
        </div>
      </main>

      {/* User History Modal */}
      {selectedUserHistory && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <header className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Lịch sử: {selectedUserHistory.email}</h3>
                <p className="text-xs text-gray-400">50 hình ảnh gần nhất</p>
              </div>
              <button 
                onClick={() => setSelectedUserHistory(null)}
                className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isHistoryLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
              ) : userHistoryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Shield className="w-12 h-12 mb-4 opacity-20" />
                  <p>Người dùng này chưa có lịch sử tạo hình.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userHistoryImages.map((img) => (
                    <div key={img.id} className="group relative aspect-square bg-black rounded-lg overflow-hidden border border-gray-700">
                      {/* Note: In a real app, we'd need to fetch from IDB or have a cloud URL. 
                          Since history uses 'idb' placeholder, admin can't see images from other machines.
                          We'll show the prompt at least. */}
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600 p-2 text-center italic">
                        {img.imageUrl === 'idb' ? 'Ảnh lưu tại máy người dùng' : 'Lỗi ảnh'}
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                        <p className="text-[10px] text-white line-clamp-3">{img.prompt}</p>
                        <p className="text-[8px] text-gray-400 mt-1">
                          {img.createdAt?.toDate ? img.createdAt.toDate().toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
