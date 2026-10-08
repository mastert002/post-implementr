import { formatDateTime } from '../utils/date';

interface StatusBadgeProps {
  isConfirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isConfirmed,
  confirmedAt,
  confirmedBy,
  updatedAt,
  updatedBy,
}) => {
  if (!isConfirmed) {
    if (updatedAt) {
      return (
        <div className="text-sm">
          <span className="inline-block px-3 py-1 font-semibold text-blue-800 bg-blue-100 rounded-full mb-1">
            Updated
          </span>
          <div className="text-gray-600 text-xs">
            {formatDateTime(updatedAt)} by {updatedBy}
          </div>
        </div>
      );
    }

    return (
      <span className="inline-block px-3 py-1 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-full">
        Pending
      </span>
    );
  }

  const date = new Date(confirmedAt!).toLocaleDateString();
  const time = new Date(confirmedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="text-sm">
      <span className="inline-block px-3 py-1 font-semibold text-green-800 bg-green-100 rounded-full mb-1">
        Confirmed
      </span>
      <div className="text-gray-600 text-xs">
        {date} {time} by {confirmedBy}
      </div>
    </div>
  );
};
