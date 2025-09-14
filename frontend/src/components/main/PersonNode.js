'use client';

import React from 'react';

const PersonNode = ({ node, sigma, size, color, x, y, zIndex, onClick }) => {
  const nodeAttributes = sigma.getGraph().getNodeAttributes(node);
  const { avatar, name } = nodeAttributes;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size,
        top: y - size,
        width: size * 2,
        height: size * 2,
        zIndex,
        cursor: 'pointer',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s ease',
      }}
      onClick={() => onClick && onClick(node)}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)';
      }}
      title={name}
    >
      <img
        src={avatar}
        alt={name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={(e) => {
          // Fallback to colored circle with initials if image fails
          e.target.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.style.cssText = `
            width: 100%;
            height: 100%;
            background: ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${size * 0.6}px;
          `;
          fallback.textContent = name.split(' ').map(n => n[0]).join('').toUpperCase();
          e.target.parentNode.appendChild(fallback);
        }}
      />
    </div>
  );
};

export default PersonNode;
