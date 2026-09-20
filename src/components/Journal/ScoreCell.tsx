import React from 'react';
import { ScoreInput } from '../ScoreInput';

interface ScoreCellProps {
  score?: number;
  onChange: (score: number | null) => void;
  criterionName: string;
  studentName: string;
  disabled?: boolean;
  tableId?: string;
  rowIndex?: number;
  colIndex?: number;
  onToggleAbsent?: () => void;
}

export const ScoreCell: React.FC<ScoreCellProps> = ({
  score,
  onChange,
  criterionName,
  studentName,
  disabled,
  tableId,
  rowIndex,
  colIndex,
  onToggleAbsent,
}) => {
  return (
    <td className="px-1.5 py-2 text-center border-r border-slate-100 last:border-r-0">
      <ScoreInput
        value={score}
        onChange={onChange}
        disabled={disabled}
        tableId={tableId}
        rowIndex={rowIndex}
        colIndex={colIndex}
        onToggleAbsent={onToggleAbsent}
        ariaLabel={`${studentName} - ${criterionName}`}
      />
    </td>
  );
};
