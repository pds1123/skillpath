import { useState, useEffect, useCallback } from 'react';
import type { CertificationKey } from '../data/questions';
import { CERTIFICATIONS } from '../data/questions';

const STORAGE_KEY = 'skillpath_active_cert';

export function useCertification() {
  const [active, setActive] = useState<CertificationKey>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CertificationKey | null;
      if (saved && CERTIFICATIONS.some(c => c.key === saved)) return saved;
    } catch {}
    return 'AZ-900';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {}
  }, [active]);

  const setCertification = useCallback((cert: CertificationKey) => {
    setActive(cert);
  }, []);

  const meta = CERTIFICATIONS.find(c => c.key === active)!;

  return { active, setCertification, meta };
}
