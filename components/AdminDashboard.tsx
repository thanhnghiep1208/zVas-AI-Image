import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, updateDoc, doc, getDoc, setDoc, deleteDoc, handleFirestoreError, OperationType, auth, where, orderBy, limit } from '../firebase';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  History,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  User,
  Users,
  XCircle,
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#05080c] text-gray-200">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,rgba(34,211,238,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_100%_0%,rgba(59,130,246,0.08),transparent_45%)]"
        aria-hidden
      />

      <header className="relative z-10 border-b border-white/[0.08] bg-gray-950/40 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-gray-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
              aria-label="Quay lại ứng dụng"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                  {analyticsOnly ? (
                    <BarChart3 className="h-4 w-4 text-cyan-300" aria-hidden />
                  ) : (
                    <LayoutDashboard className="h-4 w-4 text-cyan-300" aria-hidden />
                  )}
                </span>
                <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {analyticsOnly ? 'Analytics' : 'Bảng điều khiển'}
                </h1>
              </div>
              <p className="mt-1 max-w-xl text-sm text-gray-500">
                {analyticsOnly
                  ? 'Theo dõi xu hướng và hiệu suất — giao diện chỉ đọc, dễ đọc.'
                  : 'Chào bạn — quản lý team, cấu hình và số liệu trong một không gian gọn gàng.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            {!analyticsOnly && (
              <div
                className="flex w-full items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 sm:w-auto"
                role="tablist"
                aria-label="Mục dashboard"
              >
                {(
                  [
                    { id: 'users' as const, label: 'Người dùng', icon: Users },
                    { id: 'settings' as const, label: 'Cấu hình', icon: Settings },
                    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setActiveTab(id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:flex-initial sm:px-4 ${
                      activeTab === id
                        ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/20 text-white shadow-[0_0_20px_-8px_rgba(34,211,238,0.5)] ring-1 ring-cyan-500/30'
                        : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}

            {!analyticsOnly && (
              <div className="flex items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-gray-400 sm:justify-end">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden />
                <span>
                  <span className="font-medium text-gray-200">{users.length}</span> thành viên
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 custom-scrollbar">
        <div className="mx-auto max-w-6xl space-y-8">
          {activeTab === 'users' && (
            <section>
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-blue-600/10">
                    <User className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white">Danh sách người dùng</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Duyệt tài khoản, gán vai trò và xem lịch sử — thao tác rõ ràng, ít gây lẫn.
                    </p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                  <div className="h-11 w-11 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
                  <p className="text-sm text-gray-500">Đang tải danh sách…</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gray-950/50 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                          <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Người dùng
                          </th>
                          <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Vai trò
                          </th>
                          <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Trạng thái
                          </th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {users.map((user) => (
                          <tr key={user.uid} className="transition-colors hover:bg-white/[0.03]">
                            <td className="whitespace-nowrap px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                  alt={user.displayName}
                                  className="h-10 w-10 rounded-full border border-white/10 object-cover ring-2 ring-white/5"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-white">{user.displayName}</span>
                                  <span className="text-xs text-gray-500">{user.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4">
                              <div className="flex items-center space-x-2">
                                <select 
                                  value={user.role}
                                  onChange={(e) =>
                                    handleUpdateRole(user.uid, e.target.value as 'admin' | 'editor' | 'advice')
                                  }
                                  className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
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
                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  user.status === 'approved'
                                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
                                    : user.status === 'rejected'
                                      ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25'
                                      : 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25'
                                }`}
                              >
                                {user.status === 'approved'
                                  ? 'Đã duyệt'
                                  : user.status === 'rejected'
                                    ? 'Từ chối'
                                    : 'Chờ duyệt'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => handleUpdateStatus(user.uid, 'approved')}
                                  disabled={user.status === 'approved'}
                                  className={`rounded-lg p-2 transition-all ${
                                    user.status === 'approved'
                                      ? 'cursor-not-allowed text-gray-600'
                                      : 'text-emerald-400 hover:bg-emerald-500/15'
                                  }`}
                                  title="Duyệt"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(user.uid, 'rejected')}
                                  disabled={user.status === 'rejected'}
                                  className={`rounded-lg p-2 transition-all ${
                                    user.status === 'rejected'
                                      ? 'cursor-not-allowed text-gray-600'
                                      : 'text-red-400 hover:bg-red-500/15'
                                  }`}
                                  title="Từ chối"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => setSelectedUserHistory({ uid: user.uid, email: user.email })}
                                  className="rounded-lg p-2 text-gray-400 transition-all hover:bg-cyan-500/15 hover:text-cyan-300"
                                  title="Xem lịch sử"
                                >
                                  <History className="h-5 w-5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.uid, user.email)}
                                  className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-500/15 hover:text-red-300"
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
            <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-gray-950/50 p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-8">
              <div className="mb-8 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/20 to-blue-600/10">
                  <Shield className="h-7 w-7 text-cyan-200" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">Cấu hình hệ thống</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Cài đặt API và provider mặc định — lưu một lần, áp dụng cho cả team (khi không dùng key cá nhân).
                  </p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="flex flex-col space-y-4">
                  <label className="text-sm font-medium text-gray-400">Provider mặc định</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['gemini', 'openai', 'seedance'].map((provider) => (
                      <label 
                        key={provider} 
                        className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all ${
                          defaultProvider === provider
                            ? 'border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
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
                    <label className="text-sm font-medium text-gray-400">Gemini API Key</label>
                    <input 
                      type="password"
                      value={systemApiKey}
                      onChange={(e) => setSystemApiKey(e.target.value)}
                      placeholder="Nhập Gemini API Key..."
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-400">Gemini model</label>
                    <select 
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                    >
                      <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (3.1 Flash)</option>
                      <option value="gemini-3-pro-image-preview">Nano Banana Pro (3 Pro)</option>
                      <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-400">OpenAI API Key</label>
                    <input 
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="Nhập OpenAI API Key..."
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-400">Seedance API Key</label>
                    <input 
                      type="password"
                      value={seedanceApiKey}
                      onChange={(e) => setSeedanceApiKey(e.target.value)}
                      placeholder="Nhập Seedance API Key..."
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-400">Seedance model</label>
                    <input 
                      type="text"
                      value={seedanceModel}
                      onChange={(e) => setSeedanceModel(e.target.value)}
                      placeholder="seed-1.5-pro"
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-400">Seedance base URL (tuỳ chọn)</label>
                    <input 
                      type="text"
                      value={seedanceBaseUrl}
                      onChange={(e) => setSeedanceBaseUrl(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                    />
                    <p className="text-[10px] text-gray-500 italic">Để trống nếu sử dụng endpoint mặc định của nhà cung cấp.</p>
                  </div>
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
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
                  <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-4">
                    <p className="text-xs leading-relaxed text-amber-200/90">
                      <span className="mr-1 font-semibold text-amber-100">Hạn mức (quota):</span>
                      Nếu bạn sử dụng API Key từ dự án MIỄN PHÍ (Free Tier), bạn sẽ bị giới hạn lượt tạo ảnh rất thấp (Dưới 1500 ảnh/ngày và giới hạn số lần tạo mỗi phút). Nếu gặp lỗi "Quota Exceeded", vui lòng sử dụng API Key từ dự án có tính phí (Paid project) để có trải nghiệm ổn định hơn.
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl border border-blue-500/25 bg-blue-500/[0.08] p-4">
                    <p className="text-xs leading-relaxed text-blue-200/90">
                      <span className="mr-1 font-semibold text-blue-100">Fallback hệ thống:</span>
                      Các API Key này sẽ được dùng làm fallback hệ thống. Nếu người dùng không tự cấu hình API Key cá nhân, ứng dụng sẽ sử dụng các key này để thực hiện yêu cầu.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'analytics' && (
            <section className="rounded-2xl border border-white/[0.06] bg-gray-950/35 p-4 backdrop-blur-sm sm:p-6">
              <AnalyticsDashboard readOnly={analyticsOnly} />
            </section>
          )}
        </div>
      </main>

      {/* User History Modal */}
      {selectedUserHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-gray-950/95 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-white">Lịch sử tạo ảnh</h3>
                <p className="mt-0.5 truncate text-sm text-gray-500">{selectedUserHistory.email}</p>
                <p className="mt-1 text-xs text-gray-600">Tối đa 50 mục gần nhất</p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedUserHistory(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-gray-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </header>
            
            <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
                  <p className="text-sm text-gray-500">Đang tải lịch sử…</p>
                </div>
              ) : userHistoryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                  <History className="mb-4 h-12 w-12 text-gray-600 opacity-40" aria-hidden />
                  <p className="text-sm">Chưa có lịch sử tạo hình cho tài khoản này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
                  {userHistoryImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a1016]"
                    >
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
