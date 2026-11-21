
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import * as itemsApi from './api/items';

jest.mock('./api/items');

const originalFetch = global.fetch;

afterEach(() => {
  if (originalFetch) global.fetch = originalFetch;
  else delete global.fetch;
  jest.clearAllMocks();
});

test('renders the StorageMap application', () => {
  render(<App />);
  expect(screen.getByText(/hey there!/i)).toBeInTheDocument();
});

test('loads locations and items when opening the inventory', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, name: 'Room', parentId: null }]
  });
  itemsApi.fetchItems.mockResolvedValue([
    { id: 2, name: 'Watch', locationId: 1 }
  ]);

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
  fireEvent.click(screen.getByRole('button', { name: 'Test Login' }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Room' })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('button', { name: 'Room' }));
  expect(screen.getByText('Watch')).toBeInTheDocument();
  expect(itemsApi.fetchItems).toHaveBeenCalledTimes(1);
});
