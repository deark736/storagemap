import { fireEvent, render, screen } from '@testing-library/react';
import InventoryView from './InventoryView';

test('creates nested locations and moves a location with its descendants and items', () => {
  let inventory = [];
  const setInventory = update => {
    inventory = typeof update === 'function' ? update(inventory) : update;
  };

  const { rerender } = render(
    <InventoryView inventory={inventory} setInventory={setInventory} />
  );
  const refresh = () => rerender(
    <InventoryView inventory={inventory} setInventory={setInventory} />
  );
  const addRootLocation = name => {
    fireEvent.click(screen.getByRole('button', { name: 'Add Location' }));
    fireEvent.change(screen.getByPlaceholderText('Location name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    refresh();
  };
  const addSublocation = name => {
    fireEvent.click(screen.getByRole('button', { name: 'Add sublocation' }));
    fireEvent.change(screen.getByPlaceholderText('Sublocation name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    refresh();
  };

  addRootLocation('Room 1');
  fireEvent.click(screen.getByRole('button', { name: 'Room 1' }));
  addSublocation('Shelf 1');
  fireEvent.click(screen.getAllByRole('button', { name: 'Shelf 1' })[0]);
  addSublocation('Drawer 1');
  fireEvent.click(screen.getAllByRole('button', { name: 'Drawer 1' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  fireEvent.change(screen.getByPlaceholderText('Item name'), { target: { value: 'Watch' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  refresh();

  addRootLocation('Garage');
  fireEvent.click(screen.getAllByRole('button', { name: 'Shelf 1' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Move location' }));
  fireEvent.change(screen.getByLabelText('Move location destination'), {
    target: { value: String(inventory.find(location => location.name === 'Garage').id) }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  refresh();

  expect(screen.getAllByRole('button', { name: 'Garage' }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: 'Shelf 1' }).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole('button', { name: 'Drawer 1' })[0]);
  refresh();

  expect(screen.getByText('Watch')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Drawer 1' })).toHaveLength(2);

  const room = inventory.find(location => location.name === 'Room 1');
  const garage = inventory.find(location => location.name === 'Garage');
  expect(room.children).toEqual([]);
  expect(garage.children[0].name).toBe('Shelf 1');
  expect(garage.children[0].children[0].items[0].name).toBe('Watch');

  fireEvent.click(screen.getAllByRole('button', { name: 'Room 1' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Move location' }));
  fireEvent.change(screen.getByLabelText('Move location destination'), {
    target: { value: String(garage.id) }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  refresh();

  expect(inventory.find(location => location.name === 'Room 1')).toBeUndefined();
  expect(inventory.find(location => location.name === 'Garage').children.map(location => location.name))
    .toEqual(['Shelf 1', 'Room 1']);
});

test('displays all items alphabetically and opens an item location when selected', () => {
  const inventory = [
    {
      id: 'room',
      name: 'Room 1',
      children: [
        {
          id: 'shelf',
          name: 'Shelf 1',
          items: [{ id: 'watch', name: 'Watch' }, { id: 'book', name: 'book' }]
        }
      ]
    },
    {
      id: 'garage',
      name: 'Garage',
      items: [{ id: 'hammer', name: 'Hammer' }]
    }
  ];

  render(<InventoryView inventory={inventory} setInventory={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Display all items' }));

  const itemsList = screen.getByRole('region', { name: 'All items' });
  const listedItems = Array.from(itemsList.querySelectorAll('ol > li'));
  expect(listedItems.map(item => item.querySelector('button').textContent))
    .toEqual(['book', 'Hammer', 'Watch']);
  expect(listedItems[2]).toHaveTextContent('Room 1 > Shelf 1');

  fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
  expect(screen.getByRole('heading', { name: 'Shelf 1' })).toBeInTheDocument();
  expect(screen.getByText('Watch')).toBeInTheDocument();
});
