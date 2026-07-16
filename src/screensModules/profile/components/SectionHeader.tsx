import React from 'react';
import { Edit2, Save } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
}

const SectionHeader: React.FC<Props> = ({ title, description, isEditing, onEdit, onSave }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      <div>
        {isEditing ? (
          <button 
            onClick={onSave}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        ) : (
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Section
          </button>
        )}
      </div>
    </div>
  );
};

export default SectionHeader;
