import { useState, useCallback, useEffect } from 'react';
import { db, doc, getDoc, setDoc, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { describeApiOrNetworkError } from '../utils/userFacingError';
import {
  PUBLIC_SETTINGS_DOC_PATH,
  buildPublicSettingsPayload,
  normalizeLoginContactText,
} from '../utils/publicSettings';

const publicSettingsRef = () => doc(db, ...PUBLIC_SETTINGS_DOC_PATH);

async function fetchLoginContactText(): Promise<string> {
  const snap = await getDoc(publicSettingsRef());
  return snap.exists() ? normalizeLoginContactText(snap.data().loginContactText) : '';
}

/** Thông tin liên hệ hiển thị trên popup đăng nhập; tải khi `enabled` (popup mở). */
export function useLoginContactText(enabled: boolean): string {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetchLoginContactText()
      .then((value) => {
        if (!cancelled) setText(value);
      })
      .catch((err) => console.error('Error loading public settings:', err));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return text;
}

/** Admin chỉnh thông tin liên hệ trên popup đăng nhập (`settings/public`). */
export function useAdminLoginContact() {
  const [loginContactText, setLoginContactText] = useState('');
  const [isSavingLoginContact, setIsSavingLoginContact] = useState(false);

  const loadLoginContact = useCallback(async () => {
    try {
      setLoginContactText(await fetchLoginContactText());
    } catch (err) {
      console.error('Error loading public settings:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Không tải được thông tin liên hệ', { description: describeApiOrNetworkError(msg) });
    }
  }, []);

  const handleSaveLoginContact = async () => {
    setIsSavingLoginContact(true);
    try {
      const payload = buildPublicSettingsPayload(loginContactText, new Date());
      await setDoc(publicSettingsRef(), payload);
      setLoginContactText(payload.loginContactText);
      toast.success('Đã lưu thông tin liên hệ.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/public');
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Chưa lưu được thông tin liên hệ', { description: describeApiOrNetworkError(msg) });
    } finally {
      setIsSavingLoginContact(false);
    }
  };

  return {
    loginContactText,
    setLoginContactText,
    isSavingLoginContact,
    loadLoginContact,
    handleSaveLoginContact,
  };
}
