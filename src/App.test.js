import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login card', () => {
  render(<App />);
  const loginHeader = screen.getByText(/Login/i);
  expect(loginHeader).toBeInTheDocument();
});
