import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { searchItems } from '../api/items';
import ItemSearchBar from './ItemSearchBar';

jest.mock('../api/items', () => ({
  searchItems: jest.fn()
}));

test('refreshes search results when inventory changes', async () => {
  searchItems
    .mockResolvedValueOnce([{ id: 'item-1', name: 'Old name', locationId: 'garage' }])
    .mockResolvedValueOnce([{ id: 'item-1', name: 'New name', locationId: 'garage' }]);

  const inventory = [{
    id: 'garage',
    name: 'Garage',
    children: [],
    items: [{ id: 'item-1', name: 'Old name' }]
  }];
  const { rerender } = render(
    <ItemSearchBar inventory={inventory} onSelectResult={jest.fn()} />
  );

  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'name' }
  });

  expect(await screen.findByText('Old name')).toBeInTheDocument();
  expect(searchItems).toHaveBeenCalledTimes(1);

  rerender(
    <ItemSearchBar
      inventory={[{
        ...inventory[0],
        items: [{ id: 'item-1', name: 'New name' }]
      }]}
      onSelectResult={jest.fn()}
    />
  );

  await waitFor(() => {
    expect(searchItems).toHaveBeenCalledTimes(2);
    expect(screen.getByText('New name')).toBeInTheDocument();
  });
  expect(screen.queryByText('Old name')).not.toBeInTheDocument();
});
