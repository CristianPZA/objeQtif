import React from 'react';
import { Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EvaluationSummaryProps {
  collaboration: any;
}

const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({
  collaboration
}) => {
  const { t } = useTranslation();
  
  if (!collaboration?.evaluation || 
      !collaboration.evaluation.evaluation_referent || 
      collaboration.evaluation.statut !== 'finalisee') {
    return null;
  }

  return (
    <div className="bg-green-50 rounded-lg border border-green-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <Award className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-900">{t('evaluation.evaluationFinalized')}</h3>
          <p className="text-sm text-green-700">
            {t('evaluation.evaluationNowComplete')}
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 border border-green-200">
        <h4 className="font-medium text-green-900 mb-2">{t('evaluation.evaluationSummary')}</h4>
        <p className="text-sm text-green-800">
          {t('evaluation.evaluationTransmitted')}
        </p>
      </div>
    </div>
  );
};

export default EvaluationSummary;