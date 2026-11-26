
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

function mockInventoryRequests() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, name: 'Room', parentId: null }]
  });

  itemsApi.fetchItems.mockResolvedValue([
    { id: 2, name: 'Watch', locationId: 1 }
  ]);
}

test('renders the StorageMap application', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', {
      name: 'Know where everything belongs.'
    })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('heading', { name: 'Record' })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('heading', { name: 'Find' })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('heading', { name: 'Organize' })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('contentinfo')
  ).toBeInTheDocument();
});

test('loads locations and items when opening the inventory', async () => {
  mockInventoryRequests();

  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Log In' })
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Test Login' })
  );

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: 'Room' })
    ).toBeInTheDocument();
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Room' })
  );

  expect(screen.getByText('Watch')).toBeInTheDocument();
  expect(itemsApi.fetchItems).toHaveBeenCalledTimes(1);
});

test('opens the signup page when Get started is clicked', () => {
  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Get started' })
  );

  expect(
    screen.getByRole('heading', { name: 'Sign Up' })
  ).toBeInTheDocument();
});

test('opens the Help page when How it works is clicked', () => {
  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: 'How it works' })
  );

  expect(
    screen.getByRole('heading', {
      name: 'How to use StorageMap'
    })
  ).toBeInTheDocument();
});

test('displays all three getting started steps on the Help page', () => {
  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Help' })
  );

  expect(
    screen.getByRole('heading', {
      name: 'Create your account'
    })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('heading', {
      name: 'Add locations and items'
    })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('heading', {
      name: 'Search and find your items'
    })
  ).toBeInTheDocument();
});

test('opens the inventory from the homepage when logged in', async () => {
  mockInventoryRequests();

  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Log In' })
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Test Login' })
  );

  await screen.findByRole('button', { name: 'Room' });

  fireEvent.click(
    screen.getByRole('button', { name: 'Home', exact: true })
  );

  expect(
    screen.queryByRole('button', { name: 'Get started' })
  ).not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', { name: 'Open inventory' })
  );

  await screen.findByRole('button', { name: 'Room' });

  await waitFor(() => {
    expect(itemsApi.fetchItems).toHaveBeenCalledTimes(2);
  });
});

test('returns to the homepage when the user logs out', async () => {
  mockInventoryRequests();

  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: 'Log In' })
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Test Login' })
  );

  await screen.findByRole('button', { name: 'Room' });

  fireEvent.click(
    screen.getByRole('button', { name: 'Log Out' })
  );

  expect(
    screen.getByRole('heading', {
      name: 'Know where everything belongs.'
    })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('button', { name: 'Log In' })
  ).toBeInTheDocument();

  expect(
    screen.queryByRole('button', { name: 'Inventory' })
  ).not.toBeInTheDocument();
});

test('toggles the mobile navigation menu', () => {
  render(<App />);

  const menuButton = screen.getByRole('button', {
    name: 'Open menu'
  });

  expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(menuButton);

  expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  expect(menuButton).toHaveAccessibleName('Close menu');

  fireEvent.click(menuButton);

  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  expect(menuButton).toHaveAccessibleName('Open menu');
});

test('marks the current navigation page as active', () => {
  render(<App />);

  const homeButton = screen.getByRole('button', {
    name: 'Home',
    exact: true
  });

  const helpButton = screen.getByRole('button', {
    name: 'Help'
  });

  expect(homeButton).toHaveAttribute('aria-current', 'page');

  fireEvent.click(helpButton);

  expect(helpButton).toHaveAttribute('aria-current', 'page');
  expect(homeButton).not.toHaveAttribute('aria-current');
});
