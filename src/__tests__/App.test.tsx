import React from 'react'
import { render, screen } from '@testing-library/react';
import App from '../App';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

test('view-areaが表示されていることを確認', () => {
  render(<App />);
  
  const viewArea = screen.getByTestId('view-area');
  expect(viewArea).toBeInTheDocument();
});