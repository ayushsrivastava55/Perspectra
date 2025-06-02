interface PersonaInfo {
  name: string;
  description: string;
  color: string;
  image: string; // URL or path to profile picture
}

interface PersonaCardProps {
  info: PersonaInfo;
  isActive?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function PersonaCard({ info, isActive, isLoading, onClick }: PersonaCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'bg-red-500':
        return 'from-red-500 to-red-600 border-red-400/30';
      case 'bg-blue-500':
        return 'from-blue-500 to-blue-600 border-blue-400/30';
      case 'bg-green-500':
        return 'from-green-500 to-green-600 border-green-400/30';
      case 'bg-purple-500':
        return 'from-purple-500 to-purple-600 border-purple-400/30';
      default:
        return 'from-gray-500 to-gray-600 border-gray-400/30';
    }
  };

  const colorClasses = getColorClasses(info.color);

  return (
    <div
      onClick={onClick}
      className={`
        relative p-2 rounded-xl border w-full max-w-[100px]
        flex flex-col items-center gap-1 text-center cursor-pointer
        transition-all duration-200
        ${isActive 
          ? `bg-gradient-to-r ${colorClasses} shadow-lg scale-105` 
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        }
        ${isLoading ? 'opacity-100 cursor-not-allowed' : 'hover:scale-[1.00]'}
      `}
    >
  <div className="absolute top-1 right-1 z-20 group">
  <span className="text-white text-xs cursor-default select-none">
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 26 26" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="26" height="26" rx="5" fill="#D9D9D9" />
      <rect x="2" y="2" width="22" height="22" rx="5" fill="#8D3FD7" />
      <rect x="11" y="4" width="4" height="12" rx="2" fill="#D9D9D9" />
      <rect x="11" y="18" width="4" height="4" rx="2" fill="#D9D9D9" />
    </svg>
  </span>
  <div className="absolute z-30 hidden group-hover:block bg-black text-white text-[10px] rounded px-2 py-2 w-40 -right-1 top-5">
    {info.description}
  </div>
</div>



      {/* Profile Image */}
      <div className={`
        w-10 h-10 rounded-[10px] overflow-hidden flex items-center justify-center
        ${isActive ? 'bg-white/20' : 'bg-white/10 group-hover:bg-white/15'}
        ${isLoading ? 'animate-pulse' : ''}
      `}>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <img
            src={info.image}
            alt={info.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </div>

      {/* Name */}
      <h3 className="text-white text-xs font-medium leading-tight line-clamp-2">
        {info.name}
      </h3>

      {/* Optional: Thinking Indicator */}
      {isLoading && (
        <div className="text-[10px] text-white/60 mt-1">Thinking...</div>
      )}

      {/* Optional: Active Pulse */}
      {isActive && (
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
      )}
    </div>
  );
}
