import React from 'react';
import { Ban, LogOut } from 'lucide-react';

export interface RejectedAccessScreenProps {
  onLogout: () => void;
}

export const RejectedAccessScreen: React.FC<RejectedAccessScreenProps> = ({ onLogout }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-200 p-6 text-center">
    <div className="max-w-md space-y-6">
      <div className="bg-red-500/20 p-6 rounded-full inline-block mb-4">
        <Ban className="w-16 h-16 text-red-400" />
      </div>
      <h1 className="text-3xl font-bold text-red-400">Yêu cầu bị từ chối</h1>
      <p className="text-gray-400">Rất tiếc, yêu cầu truy cập của bạn đã bị từ chối.</p>
      <button
        type="button"
        onClick={onLogout}
        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
      >
        <LogOut className="w-5 h-5" />
        <span>Đăng xuất</span>
      </button>
    </div>
  </div>
);
