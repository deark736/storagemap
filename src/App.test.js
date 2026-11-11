
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the StorageMap application', () => {
  render(<App />);
  expect(screen.getByText(/hey there!/i)).toBeInTheDocument();
});
