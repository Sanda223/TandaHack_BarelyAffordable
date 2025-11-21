import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-card-bg rounded-2xl border border-gray-100 p-6 shadow-subtle transition-shadow duration-300 hover:shadow-subtle-hover ${className}`}>
      {children}
    </div>
  );
};

export default Card;