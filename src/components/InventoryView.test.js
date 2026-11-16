import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InventoryView from './InventoryView';
import * as api from '../api/locations';

jest.mock('../api/locations');

test('creates nested locations and moves a location with its descendants and items', async () => {
  let inventory = [];
  let nextId = 1;

  const setInventory = update => {
    inventory = typeof update === 'function' ? update(inventory) : update;
  };

  const insertNode = (nodes, parentId, newNode) => {
    if (parentId === null || parentId === undefined) {
      return [...nodes, newNode];
    }
    return nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newNode] };
      }
      return {
        ...node,
        children: insertNode(node.children || [], parentId, newNode)
      };
    });
  };

  const extractNode = (nodes, targetId) => {
    let extracted = null;
    const remaining = [];
    for (const node of nodes) {
      if (node.id === targetId) {
        extracted = node;
      } else {
        const res = extractNode(node.children || [], targetId);
        if (res.extracted) extracted = res.extracted;
        remaining.push({ ...node, children: res.remaining });
      }
    }
    return { extracted, remaining };
  };

  api.createLocation.mockImplementation(async (name, parentId = null) => {
    const newLoc = { id: nextId++, name, parentId, children: [], items: [] };
    inventory = insertNode(inventory, parentId, newLoc);
    return newLoc;
  });

  api.updateLocation.mockImplementation(async (id, updates) => {
    if ('parentId' in updates) {
      const { extracted, remaining } = extractNode(inventory, id);
      if (extracted) {
        const moved = { ...extracted, parentId: updates.parentId };
        inventory = insertNode(remaining, updates.parentId, moved);
      }
    }
    return { id, ...updates };
  });

  let rerenderFn;
  const refreshLocations = jest.fn(async () => {
    rerenderFn(
      <InventoryView
        inventory={inventory}
        setInventory={setInventory}
        refreshLocations={refreshLocations}
      />
    );
  });

  const { rerender } = render(
    <InventoryView
      inventory={inventory}
      setInventory={setInventory}
      refreshLocations={refreshLocations}
    />
  );
  rerenderFn = rerender;

  const addRootLocation = async name => {
    fireEvent.click(screen.getByRole('button', { name: 'Add Location' }));
    fireEvent.change(screen.getByPlaceholderText('Location name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  };

  const addSublocation = async name => {
    fireEvent.click(screen.getByRole('button', { name: 'Add sublocation' }));
    fireEvent.change(screen.getByPlaceholderText('Sublocation name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name }).length).toBeGreaterThan(0));
  };

  await addRootLocation('Room 1');
  fireEvent.click(screen.getByRole('button', { name: 'Room 1' }));
  await addSublocation('Shelf 1');
  fireEvent.click(screen.getAllByRole('button', { name: 'Shelf 1' })[0]);
  await addSublocation('Drawer 1');
  fireEvent.click(screen.getAllByRole('button', { name: 'Drawer 1' })[0]);

  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  fireEvent.change(screen.getByPlaceholderText('Item name'), { target: { value: 'Watch' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await refreshLocations();

  await addRootLocation('Garage');
  fireEvent.click(screen.getAllByRole('button', { name: 'Shelf 1' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Move location' }));
  fireEvent.change(screen.getByLabelText('Move location destination'), {
    target: { value: String(inventory.find(location => location.name === 'Garage').id) }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => {
    const garage = inventory.find(location => location.name === 'Garage');
    expect(garage?.children.some(child => child.name === 'Shelf 1')).toBe(true);
  });

  expect(screen.getAllByRole('button', { name: 'Garage' }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: 'Shelf 1' }).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole('button', { name: 'Drawer 1' })[0]);
  await refreshLocations();

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
  await waitFor(() => {
    expect(inventory.find(location => location.name === 'Room 1')).toBeUndefined();
  });

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

  render(<InventoryView inventory={inventory} setInventory={() => { }} refreshLocations={jest.fn()} />);
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