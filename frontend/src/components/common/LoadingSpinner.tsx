import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullPage?: boolean;
}

const sizeMap = {
  small: 20,
  medium: 40,
  large: 60,
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullPage = false,
}) => {
  const diameter = sizeMap[size];
  const strokeWidth = size === 'small' ? 2 : 3;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const spinner = (
    <div
      className={`loading-spinner loading-spinner--${size}`}
      role="status"
      aria-live="polite"
    >
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="spinner-svg"
      >
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="#1976d2"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.75}
          className="spinner-circle"
        />
      </svg>
      {message && <span className="spinner-message">{message}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullPage) {
    return <div className="loading-spinner-overlay">{spinner}</div>;
  }

  return spinner;
};

export default LoadingSpinner;
