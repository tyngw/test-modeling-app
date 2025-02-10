import React from 'react'
import { render, screen } from '@testing-library/react';
import App from '../App';

test('view-areaが表示されていることを確認', () => {
  render(<App />);
  
  const viewArea = screen.getByTestId('view-area');
  expect(viewArea).toBeInTheDocument();
});