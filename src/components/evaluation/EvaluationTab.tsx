import React from 'react';
import { Award } from 'lucide-react';
import AutoEvaluationSection from './AutoEvaluationSection';
import ReferentEvaluationSection from './ReferentEvaluationSection';
import EvaluationSummary from './EvaluationSummary';

interface EvaluationTabProps {
  collaboration: any;
  canAutoEvaluate: boolean;
  onStartAutoEvaluation: () => void;
}

const EvaluationTab: React.FC<EvaluationTabProps> = ({
  collaboration,
  canAutoEvaluate,
  onStartAutoEvaluation
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Evaluation</h2>
        <p className="text-sm text-gray-600">
          Suivez le processus d'évaluation de vos objectifs
        </p>
      </div>

      {/* Grille 2 colonnes pour les évaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1: Auto-évaluation */}
        <AutoEvaluationSection
          collaboration={collaboration}
          onStartAutoEvaluation={onStartAutoEvaluation}
          canAutoEvaluate={canAutoEvaluate}
        />

        {/* Colonne 2: Évaluation du référent */}
        <ReferentEvaluationSection
          collaboration={collaboration}
        />
      </div>

      {/* Synthèse finale (pleine largeur) */}
      <EvaluationSummary collaboration={collaboration} />
    </div>
  );
};

export default EvaluationTab;