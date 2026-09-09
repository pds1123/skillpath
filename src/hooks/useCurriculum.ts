import { useCallback, useEffect, useState } from 'react';
import type { CertificationKey } from '../data/questions';
import { getCurriculumPath } from '../services/api';
import type { CurriculumPath } from '../types/curriculum';

const PATH_BY_CERTIFICATION: Record<CertificationKey, string> = {
  'AZ-900': 'azure-fundamentals',
  'CLF-C02': 'aws-fundamentals',
  CTFL: 'istqb-ctfl',
};

export function useCurriculum(certification: CertificationKey) {
  const [result, setResult] = useState<{
    certification: CertificationKey;
    curriculum: CurriculumPath | null;
    error: string | null;
  } | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const reload = useCallback(() => {
    setResult(null);
    setRequestVersion(version => version + 1);
  }, []);

  useEffect(() => {
    let active = true;
    getCurriculumPath(PATH_BY_CERTIFICATION[certification])
      .then(result => {
        if (active) setResult({ certification, curriculum: result, error: null });
      })
      .catch(reason => {
        if (!active) return;
        setResult({
          certification,
          curriculum: null,
          error: reason instanceof Error ? reason.message : 'Unable to load the curriculum.',
        });
      });
    return () => { active = false; };
  }, [certification, requestVersion]);

  const current = result?.certification === certification ? result : null;
  return {
    curriculum: current?.curriculum ?? null,
    loading: current === null,
    error: current?.error ?? null,
    reload,
  };
}
