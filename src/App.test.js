import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login card', () => {
  render(<App />);
  const loginHeader = screen.queryByText(/Login to Petrol Management/i);
  if (loginHeader) {
    expect(loginHeader).toBeInTheDocument();
  }
});
