'use client';

export default function ActionMenu({ items, onAction }) {
  return (
    <div className="absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg">
      <div className="py-2 text-sm">
        {items.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={index} className="border-t border-gray-100 my-1"></div>;
          }

          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={(e) => onAction(item.id, e)}
              className={`flex items-center w-full px-4 py-2 hover:bg-gray-50 ${
                item.className || 'text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 mr-3" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
