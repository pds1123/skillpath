import { useState, useEffect, useCallback } from 'react';
import type { CertificationKey } from '../data/questions';
import { CERTIFICATIONS } from '../data/questions';

const STORAGE_KEY = 'skillpath_active_cert';

export function useCertification() {
  const [active, setActive] = useState<CertificationKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CertificationKey | null;
      if (saved && CERTIFICATIONS.some(c => c.key === saved)) return saved;
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return 'AZ-900';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {
      // Keep the in-memory selection when storage is unavailable.
    }
  }, [active]);

  const setCertification = useCallback((cert: CertificationKey) => {
    setActive(cert);
  }, []);

  const meta = CERTIFICATIONS.find(c => c.key === active)!;

  return { active, setCertification, meta };
}
