import React from 'react';

const RangeSlider = ({ label, min, max, step, value, onChange }) => (
  <div>
    <label>{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%' }}
    />
  </div>
);

export default RangeSlider;
