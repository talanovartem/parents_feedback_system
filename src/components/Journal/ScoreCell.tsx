import React from 'react';
import { ScoreInput } from '../ScoreInput';

interface ScoreCellProps {
  score?: number;
  onChange: (score: number | null) => void;
  criterionName: string;
  studentName: string;
}

export const ScoreCell: React.FC<ScoreCellProps> = ({
  score,
  onChange,
  criterionName,
  studentName,
}) => {
  return (
    <td className="px-1.5 py-2 text-center border-r border-slate-100 last:border-r-0">
      <ScoreInput
        value={score}
        onChange={onChange}
        ariaLabel={`${studentName} - ${criterionName}`}
      />
    </td>
  );
};
